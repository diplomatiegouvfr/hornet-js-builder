const fs = require("fs");
const os = require("os");
const path = require("path");
const camelcase = require("camelcase");
const chalk = require("chalk");
const { program } = require("commander");
const eventStream = require("event-stream");
const log = require("fancy-log"); // remplacement gulp-util.log
const JSON5 = require("json5");
const cloneDeep = require("lodash.clonedeep");
const flatten = require("lodash.flatten");
const isObject = require("lodash.isobject");
const isUndefined = require("lodash.isundefined");
const map = require("lodash.map");
const merge = require("lodash.merge");
const semver = require("semver");
const State = require("./builders/state");
const taskInfo = require("./builders/tasks/task-info");

const Helper = function () {};

program
    .version(require("../package.json").version)
    .usage("[options] <tasks ...>")
    .option("-d, --debug", "Mode debug")
    .option("-e, --external", "Mode auto external")
    .option("--pid", "Permet de ne pas exécuter les tests")
    .option("-l, --list", "Listing de toutes les tâches")
    .option("--show-webpack-files", "Log les fichiers pris en compte par webpack dans sa phase de compilation du bundle client")
    .option("--webpackVisualizer", "Visualisation de la répartition des sources projets et node modules dans un chart, /static/dev/webpack-visualizer.html")
    .option("-i, --ide", "Indique que c'est l'IDE qui compile les TS, dans ce cas la compilation TS est désactivée ainsi que les watchers associés")
    .option("-r, --registry <url>", "L'url du repository global : servant à la récupération des dépendances et à la publication")
    .option("--publish-registry <url>", "L'url du repository servant uniquement à la publication (tasks 'publish' & 'unpublish'")
    .option("-f, --force", "Forcer la mise à jour des dépendances")
    .option("--ignoreApp", "ne prend pas la version de dépendance applicative, mais la plus récente")
    .option("--skipTests", "Permet de ne pas exécuter les tests")
    .option("--skipDedupe", "Permet de ne pas exécuter npm dedupe")
    .option("--stopOnError", "Permet de stopper toutes les tâches sur une erreur")
    .option("--skipMinified", "Permet de ne pas minifier les chuncks")
    .option("--noWarn", "Permet de ne pas afficher les warnings")
    .option("-p, --debugPort <port>", "Indique le port utilisé par node pour permettre la connexion d'un debugger externe")
    .option("-m, --module <module>", "Indique le module pour lequel on souhaite avoir une recherche de version")
    .option("--file <file>", "Indique le chemin d'un fichier")
    .option("--dev", "active le mode developpement")
    .option(
        "--offline",
        "active le mode offline pour la récupération des dépendances, ex : coupure réseau. Prerequis avoir les node_modules, ajouter fetch-retries=0 dans .npmrc",
    )
    //    .option("--release <final / snapshot>", "version ou suffixe si commence par '-' ou '.'", /^(final|snapshot)$/i)
    .option("--versionFix <versionFix>", "version ou suffixe si commence par '-', '.' ou si null", (value) => {
        Helper.debug(value);
        return value ? value.replace(/'/g, "") : "auto";
    })
    .option("--versionSearch <versionSearch>", "préfixe de la dernière version", (value) => {
        Helper.debug(value);
        return value ? value.replace(/'/g, "") : "auto";
    })
    .option("--dependencyVersionFix <dependency>", "Fix une version pour une dépendance")
    .option("-s, --silent", "Permet de n'afficher que les niveaux log, error et warning")
    .allowUnknownOption()
    .passCommandToAction(true);

const oldCLog = console.log;

// Establish the object that gets returned to break out of a loop iteration.
const breaker = {};
let args = [];

const ArrayProto = Array.prototype;
const ObjProto = Object.prototype;
const { slice } = ArrayProto; //
const nativeMap = ArrayProto.map; //
const nativeForEach = ArrayProto.forEach;

// Variables statiques stockant la valeur du ficheir de configuratin du builder
Helper.TYPE = {
    PARENT: "parent",
    APPLICATION: "application",
    APPLICATION_SERVER: "application-server",
    MODULE: "module",
    CUSTOM: "custom",
    COMPOSANT: "composant",
};

Helper.RELEASE_TYPE = {
    FINAL: "final",
    SNAPSHOT: "snapshot",
};

// Variables statiques stockant la valeur du répertoire d"installation des dépendances nodejs
Helper.NODE_MODULES = "node_modules";
Helper.BUILDER_DEPENDENCIES = path.join(__dirname, "..", Helper.NODE_MODULES);

// Variables statiques stockant le nom des clés des dépendances du package.json
Helper.DEPENDENCIES = "dependencies";
Helper.DEV_DEPENDENCIES = "devDependencies";

Helper.allowJSON5 = function () {
    if (!JSON.__oldParse) {
        // autorise les : require("monFichierJson") avec extension .json5
        require("json5/lib/require");

        // surcharge JSON.parse
        JSON.__oldParse = JSON.parse;
        JSON.parse = function () {
            try {
                return JSON.__oldParse.apply(JSON, arguments);
            } catch (e) {
                return JSON5.parse.apply(JSON5, arguments);
            }
        };
    }
};

// Getter & Setter pour les modes du builder (options)
Helper.setDebug = function (value) {
    if (!isUndefined(value)) {
        process.env.IS_DEBUG_ENABLED = value === false ? "" : value;
    }
};

Helper.setCommandArgs = function (value) {
    args = value;
};

Helper.getCommandArgs = function () {
    return args;
};

Helper.setRemainingArgs = function (value) {
    process.remaining = value;
};

Helper.getRemainingArgs = function () {
    return process.remaining;
};

Helper.getCommander = function () {
    return program;
};

Helper.getTaskInfo = function (value) {
    return taskInfo[value];
};

Helper.setList = function (value) {
    if (!isUndefined(value)) {
        let taskInfoPrint;
        Object.keys(taskInfo).forEach((key) => {
            taskInfoPrint += `\n ${chalk.blue.bold(key)} | ${taskInfo[key]}`;
        });
        Helper.info(`Listing de toutes les tâches du builder${taskInfoPrint}`);
        process.exit(1);
    }
};
Helper.isDebug = function () {
    return !!process.env.IS_DEBUG_ENABLED;
};

Helper.setActiveExternal = function (value) {
    if (!isUndefined(value)) {
        process.env.IS_EXTERNAL_ENABLED = value === false ? "" : value;
    }
};

Helper.isActiveExternal = function () {
    return !!process.env.IS_EXTERNAL_ENABLED;
};

Helper.setForce = function (value) {
    if (!isUndefined(value)) {
        process.env.IS_FORCE_ENABLED = value === false ? "" : value;
    }
};
Helper.isForce = function () {
    return process.env.IS_FORCE_ENABLED || false;
};

Helper.setRegistry = function (url) {
    if (!isUndefined(url)) {
        process.env.HB_RETRIEVE_REGISTRY = process.env.HB_PUBLISH_REGISTRY = url;
    }
};
Helper.setPublishRegistry = function (url) {
    if (!isUndefined(url)) {
        process.env.HB_PUBLISH_REGISTRY = url;
    }
};
Helper.getRegistry = function () {
    return process.env.HB_RETRIEVE_REGISTRY;
};
Helper.getPublishRegistry = function () {
    return process.env.HB_PUBLISH_REGISTRY;
};

Helper.setSkipTests = function (value) {
    if (!isUndefined(value)) {
        process.env.HB_SKIP_TESTS = value === false ? "" : value;
    }
};
Helper.isSkipTests = function () {
    return process.env.HB_SKIP_TESTS || false;
};

Helper.setSkipDedupe = function (value) {
    if (!isUndefined(value)) {
        process.env.HB_SKIP_DEDUPE = value === false ? "" : value;
    }
};
Helper.isSkipDedupe = function () {
    return process.env.HB_SKIP_DEDUPE || false;
};

Helper.setSkipMinified = function (value) {
    if (!isUndefined(value)) {
        process.env.HB_SKIP_MINIFIED = value === false ? "" : value;
    }
};
Helper.isSkipMinified = function () {
    return process.env.HB_SKIP_MINIFIED || false;
};

Helper.setNoWarn = function (value) {
    if (!isUndefined(value)) {
        process.env.HB_NO_WARN = value === false ? "" : value;
    }
};
Helper.isNoWarn = function () {
    return process.env.HB_NO_WARN || false;
};

Helper.setIDE = function (value) {
    if (!isUndefined(value)) {
        process.env.HB_IDE = value === false ? "" : value;
    }
};
Helper.isIDE = function () {
    return process.env.HB_IDE || false;
};

Helper.setWebpackVisualizer = function (value) {
    if (!isUndefined(value)) {
        process.env.HB_WEBPACK_VISUALIZER = value === false ? "" : value;
    }
};
Helper.isWebpackVisualizer = function () {
    return process.env.HB_WEBPACK_VISUALIZER || false;
};

Helper.setModule = function (value) {
    if (!isUndefined(value)) {
        process.env.HB_MODULE = value;
    }
};

Helper.getModule = function () {
    return process.env.HB_MODULE;
};

Helper.setShowWebPackFiles = function (value) {
    if (!isUndefined(value)) {
        process.env.HB_SHOW_WEBPACK_FILES = value === false ? "" : value;
    }
};
Helper.isShowWebPackFiles = function () {
    return process.env.HB_SHOW_WEBPACK_FILES || false;
};
Helper.setDebugPort = function (port) {
    if (!isUndefined(port)) {
        process.env.HB_DEBUG_PORT = port;
    }
};
Helper.getDebugPort = function () {
    return parseInt(process.env.HB_DEBUG_PORT);
};

Helper.setPreInstallDev = function (skip) {
    if (!isUndefined(skip)) {
        process.env.IS_PRE_INSTALL_DEV = skip;
    }
};

Helper.isPreInstallDev = function () {
    return process.env.IS_PRE_INSTALL_DEV || false;
};

Helper.setMultiType = function (value) {
    if (!isUndefined(value)) {
        process.env.IS_MULTI_TYPE = value === false ? "" : value;
    }
};
Helper.isMultiType = function () {
    return process.env.IS_MULTI_TYPE || false;
};

Helper.setFile = function (value) {
    if (!isUndefined(value)) {
        process.env.HB_FILE = value;
    }
};
Helper.getFile = function () {
    return process.env.HB_FILE;
};

Helper.setTsFile = function (value) {
    if (!isUndefined(value)) {
        process.env.HB_TS_FILE = value;
    }
};
Helper.getTsFile = function () {
    return process.env.HB_TS_FILE;
};

Helper.setDevMode = function (value) {
    if (!isUndefined(value)) {
        process.env.IS_DEV_MODE_ENABLED = value === false ? "" : value;
    }
};
Helper.isDevMode = function () {
    return process.env.IS_DEV_MODE_ENABLED || false;
};

Helper.setOfflineMode = function (value) {
    if (!isUndefined(value)) {
        process.env.IS_OFFLINE_MODE_ENABLED = value === false ? "" : value;
    }
};
Helper.isOfflineMode = function () {
    return process.env.IS_OFFLINE_MODE_ENABLED || false;
};

Helper.setRelease = function (value) {
    if (!isUndefined(value)) {
        process.env.RELEASE = value;
    }
};
Helper.getRelease = function () {
    return process.env.RELEASE;
};

Helper.setVersion = function (value) {
    if (!isUndefined(value)) {
        process.env.VERSION = value;
    }
};

Helper.getVersion = function () {
    return process.env.VERSION;
};

Helper.setDependency = function (value) {
    if (!isUndefined(value)) {
        process.env.DEPENDENCY = value;
    }
};

Helper.getDependency = function () {
    return process.env.DEPENDENCY;
};

Helper.setStopOnError = function (value) {
    if (!isUndefined(value)) {
        process.env.HB_STOP_ON_ERROR = value === false ? "" : value;
    }
};

Helper.getStopOnError = function () {
    return process.env.HB_STOP_ON_ERROR;
};

Helper.setSilent = function (value) {
    if (!isUndefined(value)) {
        process.env.HB_SILENT = value === false ? "" : value;
    }
};
Helper.isSilent = function () {
    return process.env.HB_SILENT || false;
};

Helper.getEnvExternalModule = function () {
    const envVar = process.env.HB_EXT_MODULES;
    if (isUndefined(envVar)) {
        return [];
    }
    return envVar.split(/\s*(;|$)\s*/);
};

Helper.initFromCommander = function (program) {
    Helper.setForce(program.force);
    Helper.setDebug(program.debug);
    Helper.setActiveExternal(program.external);
    Helper.setPreInstallDev(program.pid);
    Helper.setList(program.list);
    Helper.setRegistry(program.registry);
    Helper.setPublishRegistry(program.publishRegistry);
    Helper.setSkipTests(program.skipTests);
    Helper.setSkipDedupe(program.skipDedupe);
    Helper.setSkipMinified(program.skipMinified);
    Helper.setNoWarn(program.noWarn);
    Helper.setIDE(program.ide);
    Helper.setShowWebPackFiles(program.showWebpackFiles);
    Helper.setWebpackVisualizer(program.webpackVisualizer);
    Helper.setDebugPort(program.debugPort);
    Helper.setModule(program.module);
    Helper.setFile(program.file);
    Helper.setDevMode(program.dev);
    Helper.setOfflineMode(program.offline);
    Helper.setRelease(program.release);
    Helper.setVersion(program.versionFix);
    Helper.setVersion(program.versionSearch);
    Helper.setDependency(program.dependencyVersionFix);
    Helper.setStopOnError(program.stopOnError);
    Helper.setSilent(program.silent);

    Helper.setCommandArgs(process.argv);
    Helper.setMainProcessDir(process.cwd());

    const RemainingArgs = [...program.rawArgs];
    const firstArgs = Math.max(
        RemainingArgs.findIndex((item) => item.startsWith("-")),
        0,
    );
    if (firstArgs !== 0) {
        Helper.setRemainingArgs(
            RemainingArgs.splice(firstArgs) // Remove all arguments until one --option
                .filter((item, index, array) => {
                    // If the option is consumed by commander.js, then we skip it
                    if (program.options.find((o) => o.short === item || o.long === item)) {
                        return false;
                    }

                    // If it's an argument of an option consumed by commander.js, then we
                    // skip it too
                    const prevKeyRaw = array[index - 1];
                    if (prevKeyRaw) {
                        const previousKey = camelcase(prevKeyRaw.replace("--", "").replace("no", ""));
                        if (program[previousKey] === item) {
                            return false;
                        }
                    }

                    return true;
                }),
        );
        program.args = program.args.filter((arg) => Helper.getRemainingArgs().indexOf(arg) == -1);
    }
};

Helper.initCommanderFromHelper = function () {
    const program = {};
    program.force = Helper.isForce();
    program.debug = Helper.isDebug();
    program.external = Helper.isActiveExternal();
    program.pid = Helper.isPreInstallDev();
    program.registry = Helper.getRegistry();
    program.publishRegistry = Helper.getPublishRegistry();
    program.skipTests = Helper.isSkipTests();
    program.skipDedupe = Helper.isSkipDedupe();
    program.skipMinified = Helper.isSkipMinified();
    program.noWarn = Helper.isNoWarn();
    program.ide = Helper.isIDE();
    program.showWebpackFiles = Helper.isShowWebPackFiles();
    program.webpackVisualizer = Helper.isWebpackVisualizer();
    program.debugPort = Helper.getDebugPort();
    program.module = Helper.getModule();
    program.file = Helper.getFile();
    program.dev = Helper.isDevMode();
    program.offline = Helper.isOfflineMode();
    program.release = Helper.getRelease();
    program.versionFix = Helper.getVersion();
    program.versionSearch = Helper.getVersion();
    program.dependencyVersionFix = Helper.getDependency();
    program.stopOnError = Helper.getStopOnError();
    program.silent = Helper.isSilent();
    program.rawArgs = [];
    process.argv = Helper.getCommandArgs();
    process.cwd = () => Helper.getMainProcessDir();
    return program;
};

Helper.logBuilderModes = function () {
    Helper.debug("Mode DEBUG [ON]");
    Helper.debug("Mode IDE:", Helper.isIDE() ? "[ON]" : "[OFF]");
    Helper.debug("Mode FORCE:", Helper.isForce() ? "[ON]" : "[OFF]");
    Helper.debug("Mode Offline:", Helper.isOfflineMode() ? "[ON]" : "[OFF]");
    Helper.debug("Mode Dev:", Helper.isDevMode() ? "[ON]" : "[OFF]");
    Helper.debug("Mode ShowWebPackFiles:", Helper.isShowWebPackFiles() ? "[ON]" : "[OFF]");
    Helper.debug("Mode SkipTests:", Helper.isSkipTests() ? "[ON]" : "[OFF]");
    Helper.debug("Mode SkipMinified:", Helper.isSkipMinified() ? "[ON]" : "[OFF]");
    Helper.debug("Mode NoWarn:", Helper.isNoWarn() ? "[ON]" : "[OFF]");
    Helper.debug("Mode WebpackVisualizer:", Helper.isWebpackVisualizer() ? "[ON]" : "[OFF]");
};

Helper.each = function (obj, iterator, context) {
    if (!obj) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
        obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
        for (let i = 0, l = obj.length; i < l; i++) {
            if (iterator.call(context, obj[i], i, obj) === breaker) return;
        }
    } else {
        for (const key in obj) {
            if (Helper.has(obj, key)) {
                if (iterator.call(context, obj[key], key, obj) === breaker) return;
            }
        }
    }
};

Helper.has = function (obj, key) {
    return ObjProto.hasOwnProperty.call(obj, key);
};

/**
 * Retour true si str commence par prefix
 */
Helper.startsWith = function (str, prefix) {
    return str.indexOf(prefix, 0) === 0;
};

/**
 * Retour true si str se termine par suffix
 */
Helper.endsWith = function (str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
};

/**
 * Retourne le texte avant le searchString
 * @param str
 * @param searchString
 * @returns {string}
 */
Helper.getStringBefore = function (str, searchString) {
    return str.substr(0, str.lastIndexOf(searchString));
};

//
// Méthodes de logging
//
Helper.debug = function () {
    if (!Helper.isSilent() && Helper.isDebug()) {
        const argsWithColors = chalk.grey.apply(chalk, Helper.processLogArgs(arguments));
        log.call(log, argsWithColors);
    }
};

Helper.log = function () {
    console.log(...arguments);
};

Helper.info = function () {
    !Helper.isSilent() && log.call(log, chalk.white.apply(chalk, Helper.processLogArgs(arguments)));
};

Helper.warn = function () {
    if (!Helper.isNoWarn()) {
        const argsWithColors = chalk.black.bgYellow.apply(chalk, ["[WARN]"].concat(Helper.processLogArgs(arguments)));
        log.call(log, argsWithColors);
    }
};

Helper.error = function () {
    const argsWithColors = chalk.red.apply(chalk, ["[ERROR]"].concat(Helper.processLogArgs(arguments)));
    log.call(log, argsWithColors);
};

Helper.processLogArgs = function (argsToLog) {
    // Les objets ne sont pas stringifiés avec chalk donc c'est fait main :(
    const processedArgs = map(argsToLog, function (arg) {
        if (isObject(arg)) {
            if (arg instanceof Error) {
                return [os.EOL, arg.toString()];
            }
            return [os.EOL, JSON.stringify(arg, null, 2)];
        }
        return arg;
    });

    return flatten(processedArgs);
};

//
// Tests sur les fichiers et dossiers
//
Helper.folderExists = function (pathToVerify) {
    try {
        var stat = fs.statSync(pathToVerify);
    } catch (_) {
        return false;
    }
    return stat.isDirectory();
};

Helper.fileExists = function (pathToVerify) {
    try {
        var stat = fs.statSync(pathToVerify);
    } catch (_) {
        return false;
    }
    return stat.isFile();
};

Helper.isSymlink = function (pathToVerify) {
    try {
        var stat = fs.lstatSync(pathToVerify);
    } catch (_) {
        return false;
    }
    return stat.isSymbolicLink();
};

/**
 * Lit un repertoire de manière récursive en applicant le callback sur chaque fichier
 */
Helper.readDirRecursive = function (dir, callback) {
    // Helper.debug('Reading dir: ' + dir);
    const files = fs.readdirSync(dir);

    files.forEach(function (file) {
        // Helper.debug('File: ' + file);
        const nextRead = path.join(dir, file);
        const stats = fs.lstatSync(nextRead);
        if (stats.isDirectory()) {
            Helper.readDirRecursive(nextRead + path.sep, callback);
        } else {
            callback(dir, file);
        }
    });
};

Helper.getModuleList = function (dir, project) {
    const moduleList = [];
    const builderPath = Helper.getBuilder(dir);
    
    if (fs.existsSync(builderPath)) {
        const builder = require(builderPath);
        if (builder && builder.type == Helper.TYPE.PARENT) {
            Helper.readDirRecursiveAndCallBackOnDir(dir, (currentDir, file) => {
                const packagePath = path.join(currentDir, file, "package.json");
                const builderJsPath = Helper.getBuilder(path.join(currentDir, file));
                if (!fs.existsSync(packagePath) || !fs.existsSync(builderJsPath)) {
                    // pas de package.json, pas un module
                    return false;
                }
                const builderDef = Helper.ReadTypeBuilderJS(builderJsPath);
                if (
                    builderDef &&
                    (builderDef == Helper.TYPE.APPLICATION || builderDef == Helper.TYPE.APPLICATION_SERVER) &&
                    project &&
                    (project.type == Helper.TYPE.APPLICATION || project.type == Helper.TYPE.APPLICATION_SERVER)
                ) {
                    return false;
                }

                moduleList.push(Helper.getProject(path.join(currentDir, file)));
                return true;
            });
        }
    }
    return moduleList;
};

/**
 * Lit un repertoire de manière récursive en applicant le callback sur chaque dossier, le callback doit retourner true pour lire le sous dossier
 */
Helper.readDirRecursiveAndCallBackOnDir = function (dir, callback) {
    //  helper.debug('readDirRecursive:', dir);
    const files = fs.readdirSync(dir);

    files.forEach(function (file) {
        const nextRead = path.join(dir, file);
        const stats = fs.lstatSync(nextRead);
        if (stats.isDirectory()) {
            //  helper.debug('readDirRecursive, found dir:', file);
            if (callback(dir, file)) {
                Helper.readDirRecursiveAndCallBackOnDir(nextRead + path.sep, callback);
            }
        }
    });
};

/**
 * Calcule la plus version la plus récente
 * @param versions
 * @returns {string}
 */
Helper.getLastVersion = function (versions) {
    let lastVersion = versions[0];
    const semver = require("semver");
    for (let i = 1; i < versions.length; i++) {
        if (semver.lt(lastVersion, versions[i])) {
            lastVersion = versions[i];
        }
    }
    return lastVersion;
};

/**
 * Retourne le path du cache en l'ayant créé auparavant
 * @returns {*}
 */
Helper.findCacheFolder = function () {
    const paths = Helper.getCachePathfolders();

    for (let i = 0; i < paths.length; i++) {
        if (Helper.folderExists(paths[i])) return paths[i];
    }

    fs.mkdirSync(paths[0]);
    return paths[0];
};

/**
 * Retourne une liste de répertoires susceptibles de contenir le cache
 * @returns {Array}
 */
Helper.getCachePathfolders = function () {
    const tryPaths = [];
    const cacheFolderName = process.env.HORNET_BUILDER_CACHE || "hbc";

    if (process.platform === "win32" && process.env.APPDATA && Helper.folderExists(process.env.APPDATA)) {
        tryPaths.push(path.resolve(path.join(process.env.APPDATA, cacheFolderName)));
    }

    tryPaths.push(path.join(process.env.HOME, cacheFolderName));
    tryPaths.push(path.resolve(path.join(".", cacheFolderName)));

    return tryPaths;
};

Helper.readInstalledDependencies = function (nodeModulesPath, recursive = true) {
    let installed = {};
    if (Helper.folderExists(nodeModulesPath)) {
        const files = fs.readdirSync(nodeModulesPath);
        Helper.each(files, function (file) {
            if (Helper.fileExists(path.join(nodeModulesPath, file, "package.json"))) {
                const json = require(path.join(nodeModulesPath, file, "package.json"));
                installed[json.name] = json.version;
            } else {
                installed = { ...installed, ...Helper.readInstalledDependencies(path.join(nodeModulesPath, file)) };
            }
        });
    }
    return installed;
};

/**
 * Supprime un répertoire et tous ses sous-répertoires
 * @param dir
 */
Helper.removeDir = function (dir) {
    if (Helper.folderExists(dir) || Helper.isSymlink(dir)) {
        const moduleResolver = require("./module-resolver");
        moduleResolver.addModuleDirectory(Helper.BUILDER_DEPENDENCIES);
        require("rimraf").sync(dir);
        moduleResolver.removeModuleDirectory(Helper.BUILDER_DEPENDENCIES);
    }
};

Helper.getExternalModuleDirectories = function (project, addNodeModules, addOnlyParent) {
    const moduleDirectories = [];
    try {
        const builder = project.builderJs;
        const extDirectories =
            Helper.getEnvExternalModule().length > 0 ? Helper.getEnvExternalModule() : (builder.externalModules && builder.externalModules.directories) || [];
        if (
            builder.externalModules &&
            ((builder.externalModules && builder.externalModules.enabled) || Helper.isActiveExternal()) &&
            extDirectories.length > 0
        ) {
            const current = process.cwd();
            const currentType = builder.type;
            extDirectories.forEach((directory) => {
                try {
                    directory = directory.replace("~", os.homedir());
                    if (fs.statSync(directory).isDirectory()) {
                        let moduleTarget = directory;
                        const typeScriptOption = Helper.resolveTypescriptConfig(directory, "tsconfig.json", null);
                        if (typeScriptOption) {
                            let tscOutDir = typeScriptOption.compilerOptions || {};
                            tscOutDir = tscOutDir.outDir || undefined;
                            if (tscOutDir) {
                                moduleTarget = path.resolve(directory, tscOutDir);
                            }
                        }

                        moduleDirectories.push(moduleTarget);

                        if (addNodeModules) {
                            const nModules = path.resolve(path.join(directory, Helper.NODE_MODULES));
                            if (fs.existsSync(nModules) && fs.statSync(nModules).isDirectory()) {
                                moduleDirectories.push(nModules);
                            }
                        }

                        // on vérifie si des répertoires du 1er niveau sont des modules nodejs pour les ajouter eux aussi
                        const files = fs.readdirSync(directory);
                        files.forEach((file) => {
                            const modPath = path.join(directory, file);
                            if (fs.statSync(modPath).isDirectory()) {
                                if (file.indexOf(".") == 0) return;
                                // si un fichier "package.json" existe, c"est un module nodejs
                                if (fs.existsSync(path.join(modPath, "package.json"))) {
                                    const builderFile = Helper.getBuilder(modPath);
                                    if (fs.existsSync(builderFile)) {
                                        const path2addBuilderJS = Helper.ReadTypeBuilderJS(builderFile);
                                        if (
                                            (path2addBuilderJS !== Helper.TYPE.APPLICATION && path2addBuilderJS !== Helper.TYPE.APPLICATION_SERVER) ||
                                            (currentType !== Helper.TYPE.APPLICATION && currentType !== Helper.TYPE.APPLICATION_SERVER && current === modPath)
                                        ) {
                                            moduleDirectories.push(modPath);
                                            if (addNodeModules) {
                                                const nModules = path.resolve(path.join(modPath, Helper.NODE_MODULES));
                                                if (fs.existsSync(nModules) && fs.statSync(nModules).isDirectory()) {
                                                    moduleDirectories.push(nModules);
                                                }
                                            }
                                        } else {
                                            Helper.info(`Exclusion : ${path2addBuilderJS}`);
                                        }
                                    }
                                }
                            }
                        });
                    }
                } catch (e) {
                    Helper.error(`MODULE RESOLVER > erreur lors de la lecture du répertoire externe '${directory}' :`, e);
                    process.exit(1);
                }
            });
        }

        if (builder && builder.type === Helper.TYPE.PARENT) {
            if (!addOnlyParent) {
                Helper.getModuleList(project.dir, project).forEach(function (module) {
                    moduleDirectories.push(module.dir);
                });
            } else {
                moduleDirectories.push(project.dir, "..");
            }
        } else {
            // si on traite un module dans un projet de type parent, on ajoute tous les modules de ce dernier
            const parentBuilderFile = Helper.getBuilder(path.join(project.dir, "../"));
            if (fs.existsSync(parentBuilderFile)) {
                const parentBuilderJs = require(parentBuilderFile);
                if (parentBuilderJs.type === Helper.TYPE.PARENT) {
                    moduleDirectories.push(path.resolve(project.dir, ".."));
                    if (!addOnlyParent) {
                        Helper.getModuleList(path.join(project.dir, "../"), project).forEach((module) => {
                            if (
                                (project.packageJson.dependencies && project.packageJson.dependencies[module.name]) ||
                                (project.packageJson.devDependencies && project.packageJson.devDependencies[module.name])
                            ) {
                                const typeScriptOption = Helper.resolveTypescriptConfig(module.dir, "tsconfig.json", null);
                                if (typeScriptOption) {
                                    let tscOutDir = typeScriptOption.compilerOptions || {};
                                    tscOutDir = tscOutDir.outDir || undefined;
                                    if (tscOutDir) {
                                        moduleDirectories.push(path.resolve(module.dir, tscOutDir));
                                    }
                                }
                                moduleDirectories.push(module.dir);
                                moduleDirectories.push(path.join(module.dir, Helper.NODE_MODULES));
                            }
                        });
                    }
                }
            }
        }
    } catch (e) {
        console.error("MODULE RESOLVER > lors de la résolution des externals module' :", e);
    }
    return moduleDirectories;
};

Helper.getExternalModules = function (project) {
    const externalDirectories = Helper.getExternalModuleDirectories(project);
    const modules = [];
    externalDirectories.forEach(function (dir) {
        const packageJsonPath = path.join(dir, "package.json");
        if (fs.existsSync(packageJsonPath)) {
            const typeScriptOption = Helper.resolveTypescriptConfig(dir, "tsconfig.json", null);
            let moduleTarget;
            if (typeScriptOption) {
                let tscOutDir = typeScriptOption.compilerOptions || {};
                tscOutDir = tscOutDir.outDir || undefined;
                if (tscOutDir) {
                    moduleTarget = path.resolve(dir, tscOutDir);
                }
            }

            const packageJson = require(packageJsonPath);
            modules.push({
                dir,
                name: packageJson.name,
                version: packageJson.version,
                packageJson,
                external: true,
                moduleTarget,
            });
        }
    });
    return modules;
};

Helper.applyExternalModuleDirectories = function (moduleResolver, project) {
    const externalModuleDirectories = Helper.getExternalModuleDirectories(project);
    externalModuleDirectories.forEach(function (dir) {
        Helper.info(`MODULE RESOLVER > le répertoire '${dir}' est déclaré`);
        moduleResolver.addModuleDirectory(dir);
    });

    const parentBuilderFile = Helper.getBuilder(path.join(project.dir, "../"));
    if (fs.existsSync(parentBuilderFile)) {
        const parentBuilderJs = require(parentBuilderFile);
        if (parentBuilderJs.type === Helper.TYPE.PARENT) {
            moduleResolver.addModuleDirectory(path.join(project.dir, "../"));
        }
    }
};

Helper.requireUncached = function (module) {
    delete require.cache[require.resolve(module)];
    return require(module);
};

Helper.getCurrentProject = function () {
    return Helper.getProject(process.cwd());
};

Helper.ReadTypeBuilderJS = function (path) {
    const data = fs.readFileSync(path, "utf8");
    const regex = /type:\s*["|'](\S+)["|']\s*/g;
    const corresp = regex.exec(data);
    return corresp && corresp[1]; // pour avoir un type avant d'installer le byuildDependencies
};

Helper.getBuilder = (dir) => {
    let builderJsPath = path.join(dir, ".builder.js");

    if (!fs.existsSync(builderJsPath)) {
        builderJsPath = path.join(dir, "builder.js");
    }
    return builderJsPath;
};

Helper.getProject = (dir) => {
    const packageJsonPath = path.join(dir, "package.json");
    const builderJsPath = Helper.getBuilder(dir);
    // FIXME : Currently, only default configuration is used (override done by configjs are not used)
    let configProjectPath = path.join(dir, "config", "default.js");
    if (!fs.existsSync(configProjectPath)) {
        configProjectPath = path.join(dir, "config", "default.json");
    }

    if (!fs.existsSync(packageJsonPath)) {
        Helper.error(`Le projet doit avoir un fichier package.json (dir=${dir})`);
        process.exit(1);
    }

    if (!fs.existsSync(builderJsPath)) {
        Helper.error(`Le projet doit avoir un fichier .builder.js (dir=${dir})`);
        process.exit(1);
    }
    const builderJsType = Helper.ReadTypeBuilderJS(builderJsPath);
    const moduleResolver = require("./module-resolver");
    moduleResolver.addModuleDirectory(dir);

    const packageJson = require(packageJsonPath);
    let configProject = {};
    if (builderJsType === Helper.TYPE.APPLICATION) {
        if (!fs.existsSync(configProjectPath)) {
            Helper.error(`Le projet doit avoir un fichier default.js ou default.json (dir=${dir})`);
            process.exit(1);
        }
        configProject = require(configProjectPath);
    }
    let contextRoot;
    if (configProject) {
        contextRoot = configProject.contextPath;
    }

    const staticPath = `/${contextRoot || packageJson.name}/static-${packageJson.version}/`;

    moduleResolver.removeModuleDirectory(dir);

    return {
        name: packageJson.name,
        version: packageJson.version,
        type: builderJsType,
        dir,
        packageJson,
        configJson: configProject,
        configJsonPath: configProjectPath,
        packageJsonPath,
        builderJs: builderJsPath,
        staticPath,
        tsConfig: Helper.resolveTypescriptConfig(dir, Helper.getTsFile() || "tsconfig.json", null),
    };
};

Helper.loadSubModuleTasks = function (project) {
    return new Promise(function (resolve, reject) {
        Helper.debug(`chargement des taches du sous module : ${project.name}`);
        Helper.setCurrentSubModule(project);
        require("./builders-loader")(project, function () {
            Helper.setCurrentSubModule(null);
            resolve();
        });
    });
};

Helper.setCurrentSubModule = function (project) {
    this.currentSubModule = project;
    if (project) {
        process.chdir(project.dir);
    }
};

Helper.getCurrentSubModule = function () {
    return this.currentSubModule;
};

/**
 *
 * @param done gulp task done callback
 * @param streams streams to merge
 * @returns {EventEmitter}
 */
Helper.stream = function (done, streams) {
    const cb = arguments[0];
    return eventStream.merge.apply(eventStream, [].slice.call(arguments, 1)).on("end", function () {
        cb();
    });
};

Helper.setMainProcessDir = function (value) {
    if (!isUndefined(value)) {
        process.env.HB_MAIN_CWD = value;
    } else {
        process.env.HB_MAIN_CWD = process.cwd();
    }
};

Helper.getMainProcessDir = function () {
    return process.env.HB_MAIN_CWD;
};

Helper.checkTasksExistence = function (gulp, tasks, exit = true) {
    let allExist = true;
    tasks.forEach(function (task) {
        if (!gulp._getTask(task)) {
            log(chalk.red(`La tâche '${task}' n'existe pas ou n'est pas compatible avec votre type de projet`));
            exit && process.exit(1);
            allExist = false;
        }
    });
    return allExist;
};

Helper.isValidVersion = function (version, moduleName) {
    if (!semver.validRange(version)) {
        return false;
    }
    if (version.substring(0, 1).match("[~,>,>=,<,<=,=]") != null) {
        version = version.substring(1);
    }

    // On autorise toute les versions release valide
    if (semver.prerelease(version) == null) {
        return semver.validRange(version) != null;
    }

    if (semver.prerelease(Helper.getCurrentProject().version) != null) {
        return semver.validRange(version) != null;
    }
    return false;
};

/**
 * Retourne la dépendance entre modules d'un projet dans un parent
 */
Helper.getModuleDependencies = function (project) {
    const ParentDir = path.resolve(project.dir, "../");
    const parentBuilderFile = Helper.getBuilder(ParentDir);
    if (fs.existsSync(parentBuilderFile)) {
        const parentBuilderJs = require(parentBuilderFile);
        if (parentBuilderJs.type === Helper.TYPE.PARENT) {
            Helper.debug("recherche des modules depuis : ", ParentDir);
            State.parentBuilder.externalModules = parentBuilderJs.externalModules;
            const moduleList = Helper.getModuleList(ParentDir);

            // Extraction des dépendances entre les modules
            moduleList.forEach(function (mod) {
                mod.dependencies = [];
                const json = mod.packageJson;
                const dep = json[Helper.DEPENDENCIES] || {};
                const testDep = json[Helper.DEV_DEPENDENCIES] || {};

                moduleList.forEach(function (dependent) {
                    if (dep[dependent.name] || testDep[dependent.name]) {
                        mod.dependencies.push(dependent.name);
                    }
                });
            });

            // on trie les modules de façon à gérer les inter-dépendances
            moduleList.sort(function (p1, p2) {
                return p1.dependencies.indexOf(p2.name) != -1 ? -1 : 1;
            });
            moduleList.sort(function (p1, p2) {
                return p1.dependencies.indexOf(p2.name) != -1 ? -1 : 1;
            });

            moduleList.reverse();
            Helper.debug("Modules trouvés :", moduleList);
            const idxProject = moduleList.findIndex((mod) => {
                return mod.name === project.name;
            });
            const current = moduleList.splice(idxProject)[0];
            return moduleList.filter((mod) => {
                return current.dependencies.includes(mod.name);
            });
        }
    }
};

/**
 * Fonction retournant une fonction de mapping ajoutant les arguments avant ceux du tableau sur lequel s'applique le mapping avec 'path.join'
 * @param ...args les arguments à ajouter
 * @returns {Function}
 */
Helper.prepend = function () {
    const prependArgs = Array.prototype.slice.call(arguments, 0);
    return function (element) {
        if (prependArgs.length === 1) {
            if (prependArgs[0] === "!") {
                return prependArgs[0] + element;
            }
            return path.join(prependArgs[0], element);
        }
        return prependArgs.map(function (argElement) {
            if (typeof element === "string" || element instanceof String) {
                if (element[0] === "!") {
                    return path.join(element[0] + argElement, element.substring(1));
                }
                return path.join(argElement, element);
            }
        });
    };
};

/**
 * Fonction copy de répertoire
 * @param src répertoire source
 * @param src répertoire destination
 */
Helper.copyDir = function (src, dest) {
    fs.mkdirSync(dest);
    const files = fs.readdirSync(src);
    for (let i = 0; i < files.length; i++) {
        const current = fs.lstatSync(path.join(src, files[i]));
        if (current.isDirectory()) {
            Helper.copyDir(path.join(src, files[i]), path.join(dest, files[i]));
        } else if (current.isSymbolicLink()) {
            const symlink = fs.readlinkSync(path.join(src, files[i]));
            fs.symlinkSync(symlink, path.join(dest, files[i]));
        } else {
            fs.copyFileSync(path.join(src, files[i]), path.join(dest, files[i]));
        }
    }
};

Helper.resolveTypescriptConfig = function (directory, configName, config) {
    const tsconfigFile = path.join(directory, configName);
    let actualConf = cloneDeep(config);

    if (fs.existsSync(tsconfigFile)) {
        const configTypescript = require(tsconfigFile);
        if (configTypescript && configTypescript.extends) {
            actualConf = merge(
                actualConf,
                Helper.resolveTypescriptConfig(
                    path.resolve(directory, path.dirname(configTypescript.extends)),
                    `${path.basename(configTypescript.extends)}.json`,
                    actualConf,
                ),
            );
        }
        actualConf = merge(actualConf, configTypescript);
    }
    Helper.debug(directory, configName, `extend : ${actualConf ? actualConf.extends : null}`);
    return actualConf;
};

module.exports = Helper;
