"use strict";
const log = require('fancy-log'); // remplacement gulp-util.log
const fs = require("fs");
const chalk = require("chalk");
const isObject = require("lodash.isobject");
const isUndefined = require("lodash.isundefined");
const map = require("lodash.map");
const flatten = require("lodash.flatten");
const cloneDeep = require("lodash.clonedeep");
const merge = require("lodash.merge");
const os = require("os");
const path = require("path");
const semver = require("semver");
const eventStream = require("event-stream");
const JSON5 = require("json5");
const State = require("./builders/state");

const taskInfo = require("./builders/tasks/task-info");

const shell = require("shelljs");
const vorpal = require("vorpal")();

vorpal.command("$ [cmd...]", "run command in a shell terminal, ex : '$ ls'")
    .allowUnknownOptions()
    .action(async function (args) {
        shell.exec(vorpal._command.command.substring(2));
    });

var Helper = function () {
};

var oldCLog = console.log;


// Establish the object that gets returned to break out of a loop iteration.
var breaker = {};
var args = [];

var ArrayProto = Array.prototype, ObjProto = Object.prototype;
var slice = ArrayProto.slice, //
    nativeMap = ArrayProto.map, //
    nativeForEach = ArrayProto.forEach;

// Variables statiques stockant la valeur du ficheir de configuratin du builder
Helper.BUILDER_FILE = "builder.js";
Helper.TYPE = {
    PARENT: "parent",
    APPLICATION: "application",
    APPLICATION_SERVER: "application-server",
    MODULE: "module",
    CUSTOM: "custom",
    COMPOSANT: "composant"
}

Helper.RELEASE_TYPE = {
    FINAL: "final",
    SNAPSHOT: "snapshot"
}

// Variables statiques stockant la valeur du répertoire d"installation des dépendances nodejs
Helper.NODE_MODULES = "node_modules";
Helper.BUILDER_DEPENDENCIES = path.join(__dirname, "..", Helper.NODE_MODULES);

// Variables statiques stockant le nom des clés des dépendances du package.json
Helper.DEPENDENCIES = "dependencies";
Helper.DEV_DEPENDENCIES = "devDependencies";

Helper.allowJSON5 = function () {
    if (!JSON["__oldParse"]) {
        // autorise les : require("monFichierJson") avec extension .json5
        require("json5/lib/require");

        // surcharge JSON.parse
        JSON["__oldParse"] = JSON.parse;
        JSON.parse = function () {
            try {
                return JSON["__oldParse"].apply(JSON, arguments);
            } catch (e) {
                return JSON5.parse.apply(JSON5, arguments);
            }
        };
    }
}

// Getter & Setter pour les modes du builder (options)
Helper.setDebug = function (value) {
    if (!isUndefined(value)) {
        process.env.IS_DEBUG_ENABLED = value;
    }
};

Helper.setCommandArgs = function (value) {
    args = value;
}

Helper.getCommandArgs = function () {
    return args;
}

Helper.setRemainingArgs = function (value) {
    process.remaining = value;
}

Helper.getRemainingArgs = function () {
    return process.remaining;
}

Helper.getVorpal = function () {
    return vorpal;
}

Helper.getTaskInfo = function (value) {
    return taskInfo[value];
}

Helper.setList = function (value) {

    if (!isUndefined(value)) {
        let taskInfoPrint;
        Object.keys(taskInfo).forEach((key) => {
            taskInfoPrint += "\n " + chalk.blue.bold(key) + " | " + taskInfo[key];
        })
        Helper.info("Listing de toutes les tâches du builder" + taskInfoPrint);
        process.exit(1);
    }
};
Helper.isDebug = function () {
    return process.env.IS_DEBUG_ENABLED ? true : false;
};

Helper.setActiveExternal = function (value) {
    if (!isUndefined(value)) {
        process.env.IS_EXTERNAL_ENABLED = value;
    }
};

Helper.isActiveExternal = function () {
    return process.env.IS_EXTERNAL_ENABLED ? true : false;
};

Helper.setForce = function (value) {
    if (!isUndefined(value)) {
        process.env.IS_FORCE_ENABLED = value;
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
        process.env.HB_SKIP_TESTS = value;
    }
};
Helper.isSkipTests = function () {
    return process.env.HB_SKIP_TESTS || false;
};

Helper.setSkipDedupe = function (value) {
    if (!isUndefined(value)) {
        process.env.HB_SKIP_DEDUPE = value;
    }
};
Helper.isSkipDedupe = function () {
    return process.env.HB_SKIP_DEDUPE || false;
};

Helper.setSkipMinified = function (value) {
    if (!isUndefined(value)) {
        process.env.HB_SKIP_MINIFIED = value;
    }
};
Helper.isSkipMinified = function () {
    return process.env.HB_SKIP_MINIFIED || false;
};

Helper.setNoWarn = function (value) {
    if (!isUndefined(value)) {
        process.env.HB_NO_WARN = value;
    }
};
Helper.isNoWarn = function () {
    return process.env.HB_NO_WARN || false;
};

Helper.setIDE = function (value) {
    if (!isUndefined(value)) {
        process.env.HB_IDE = value;
    }
};
Helper.isIDE = function () {
    return process.env.HB_IDE || false;
};

Helper.setWebpackVisualizer = function (value) {
    if (!isUndefined(value)) {
        process.env.HB_WEBPACK_VISUALIZER = value;
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
        process.env.HB_SHOW_WEBPACK_FILES = value;
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

Helper.setLintRules = function (rules) {
    if (!isUndefined(rules)) {
        process.env.HB_LINT_RULES = rules;
    }
};

Helper.getLintRules = function () {
    return process.env.HB_LINT_RULES;
};

Helper.setLintReport = function (report) {
    if (!isUndefined(report)) {
        process.env.HB_LINT_REPORT = report;
    }
};

Helper.getLintReport = function () {
    return process.env.HB_LINT_REPORT || "prose";
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
        process.env.IS_MULTI_TYPE = value;
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

Helper.setDevMode = function (value) {
    if (!isUndefined(value)) {
        process.env.IS_DEV_MODE_ENABLED = value;
    }
};
Helper.isDevMode = function () {
    return process.env.IS_DEV_MODE_ENABLED || false;
};

Helper.setOfflineMode = function (value) {
    if (!isUndefined(value)) {
        process.env.IS_OFFLINE_MODE_ENABLED = value;
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

Helper.setQuery = function (value) {
    if (!isUndefined(value)) {
        process.env.QUERY = value;
    }
};

Helper.getQuery = function () {
    return process.env.QUERY;
};

Helper.setUri = function (value) {
    if (!isUndefined(value)) {
        process.env.URI = value;
    }
};

Helper.getUri = function () {
    return process.env.URI;
};

Helper.setStopOnError = function (value) {
    if (!isUndefined(value)) {
        process.env.HB_STOP_ON_ERROR = value;
    }
}

Helper.getStopOnError = function () {
    return process.env.HB_STOP_ON_ERROR;
};

Helper.getEnvExternalModule = function () {
    let envVar = process.env.HB_EXT_MODULES;
    if (isUndefined(envVar)) {
        return [];
    }
    return envVar.split(/\s*(;|$)\s*/)
};

Helper.logBuilderModes = function () {
    Helper.debug("Mode DEBUG [ON]");
    Helper.debug("Mode IDE:", (Helper.isIDE() ? "[ON]" : "[OFF]"));
    Helper.debug("Mode FORCE:", (Helper.isForce() ? "[ON]" : "[OFF]"));
    Helper.debug("Mode Offline:", (Helper.isOfflineMode() ? "[ON]" : "[OFF]"));
    Helper.debug("Mode Dev:", (Helper.isDevMode() ? "[ON]" : "[OFF]"));
    Helper.debug("Mode ShowWebPackFiles:", (Helper.isShowWebPackFiles() ? "[ON]" : "[OFF]"));
    Helper.debug("Mode SkipTests:", (Helper.isSkipTests() ? "[ON]" : "[OFF]"));
    Helper.debug("Mode SkipMinified:", (Helper.isSkipMinified() ? "[ON]" : "[OFF]"));
    Helper.debug("Mode NoWarn:", (Helper.isNoWarn() ? "[ON]" : "[OFF]"));
    Helper.debug("Mode WebpackVisualizer:", (Helper.isWebpackVisualizer() ? "[ON]" : "[OFF]"));
    Helper.debug("Mode LintRules:", Helper.getLintRules());
    Helper.debug("Mode LintReport:", Helper.getLintReport());
};


Helper.each = function (obj, iterator, context) {
    if (!obj)
        return;
    if (nativeForEach && obj.forEach === nativeForEach) {
        obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
        for (var i = 0, l = obj.length; i < l; i++) {
            if (iterator.call(context, obj[i], i, obj) === breaker)
                return;
        }
    } else {
        for (var key in obj) {
            if (Helper.has(obj, key)) {
                if (iterator.call(context, obj[key], key, obj) === breaker)
                    return;
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
    if (Helper.isDebug()) {
        var argsWithColors = chalk.grey.apply(chalk, Helper.processLogArgs(arguments));
        log.call(log, argsWithColors);
    }
};

Helper.info = function () {
    log.call(log, chalk.white.apply(chalk, Helper.processLogArgs(arguments)));
};

Helper.warn = function () {
    if (!Helper.isNoWarn()) {
        var argsWithColors = chalk.black.bgYellow.apply(chalk, ["[WARN]"].concat(Helper.processLogArgs(arguments)));
        log.call(log, argsWithColors);
    }

};

Helper.error = function () {
    var argsWithColors = chalk.red.apply(chalk, ["[ERROR]"].concat(Helper.processLogArgs(arguments)));
    log.call(log, argsWithColors);
};

Helper.processLogArgs = function (args) {
    //Les objets ne sont pas stringifiés avec chalk donc c'est fait main :(
    var processedArgs = map(args, function (arg) {
        if (isObject(arg)) {
            if (arg instanceof Error) {
                return [os.EOL, arg.toString()];
            }
            return [os.EOL, JSON.stringify(arg, null, 2)];
        } else {
            return arg;
        }
    });

    return flatten(processedArgs);
};

//
// Tests sur les fichiers et dossiers
//
Helper.folderExists = function (path) {
    try {
        var stat = fs.statSync(path);
    } catch (_) {
        return false
    }
    return stat.isDirectory();
};

Helper.fileExists = function (path) {
    try {
        var stat = fs.statSync(path);
    } catch (_) {
        return false
    }
    return stat.isFile()
};

Helper.isSymlink = function (path) {
    try {
        var stat = fs.lstatSync(path);
    } catch (_) {
        return false
    }
    return stat.isSymbolicLink();
};


/**
 * Lit un repertoire de manière récursive en applicant le callback sur chaque fichier
 */
Helper.readDirRecursive = function (dir, callback) {
    //Helper.debug('Reading dir: ' + dir);
    var files = fs.readdirSync(dir);

    files.forEach(function (file) {
        //Helper.debug('File: ' + file);
        var nextRead = path.join(dir, file);
        var stats = fs.lstatSync(nextRead);
        if (stats.isDirectory()) {
            Helper.readDirRecursive(nextRead + path.sep, callback);
        } else {
            callback(dir, file);
        }
    });
};


Helper.getModuleList = function (dir, project) {
    var moduleList = [];
    var builderPath = path.join(dir, "builder.js");
    var current = process.cwd();
    let builderCurrentFile = path.join(current, Helper.BUILDER_FILE);
    let path2addCurrentBuilderJS;
    if (fs.existsSync(builderCurrentFile)) {
        path2addCurrentBuilderJS = Helper.ReadTypeBuilderJS(builderCurrentFile);
    }
    if (fs.existsSync(builderPath)) {
        var builder = require(builderPath);
        if (builder && builder.type == Helper.TYPE.PARENT) {
            Helper.readDirRecursiveAndCallBackOnDir(dir, (dir, file) => {
                var packagePath = path.join(dir, file, "package.json");
                var builderJsPath = path.join(dir, file, "builder.js");
                if (!fs.existsSync(packagePath) || !fs.existsSync(builderJsPath)) {
                    // pas de package.json, pas un module
                    return false;
                }
                let builderDef = Helper.ReadTypeBuilderJS(builderJsPath);
                if (builderDef
                    && (builderDef == Helper.TYPE.APPLICATION || builderDef == Helper.TYPE.APPLICATION_SERVER)
                    && (project && (project.type == Helper.TYPE.APPLICATION || project.type == Helper.TYPE.APPLICATION_SERVER))) {
                    return false;
                }

                moduleList.push(Helper.getProject(path.join(dir, file)));
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
    var files = fs.readdirSync(dir);

    files.forEach(function (file) {
        var nextRead = path.join(dir, file);
        var stats = fs.lstatSync(nextRead);
        if (stats.isDirectory()) {
            //  helper.debug('readDirRecursive, found dir:', file);
            if (callback(dir, file)) {
                Helper.readDirRecursiveAndCallBackOnDir(nextRead + path.sep, callback);
            }
        }
    });
};

/**
 * Tri un objet avec un comparateur
 * default : tri alphabétique sur les clés de l'objet
 * @param obj
 * @param cmp
 * @returns {object}
 */
Helper.sortObj = function (obj, cmp) {
    var r = [];
    for (var i in obj)
        if (obj.hasOwnProperty(i)) r.push({ key: i, value: obj[i] });

    return r.sort(cmp || function (o1, o2) {
        return o1.key < o2.key ? -1 : o1.key > o2.key ? 1 : 0;
    }).reduce(function (obj, n) {
        obj[n.key] = n.value;
        return obj;
    }, {});
};

/**
 * Calcule la plus version la plus récente
 * @param versions
 * @returns {string}
 */
Helper.getLastVersion = function (versions) {
    var lastVersion = versions[0];
    var semver = require("semver");
    for (var i = 1; i < versions.length; i++) {
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
    var paths = Helper.getCachePathfolders();

    for (var i = 0; i < paths.length; i++) {
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
    var tryPaths = [];
    var cacheFolderName = process.env.HORNET_BUILDER_CACHE || "hbc";

    if (process.platform === "win32"
        && process.env.APPDATA
        && Helper.folderExists(process.env.APPDATA)) {
        tryPaths.push(path.resolve(path.join(process.env.APPDATA, cacheFolderName)));
    }

    tryPaths.push(path.join(process.env.HOME, cacheFolderName));
    tryPaths.push(path.resolve(path.join(".", cacheFolderName)));

    return tryPaths;
};

Helper.readInstalledDependencies = function (nodeModulesPath, recursive = true) {
    var installed = {};
    if (Helper.folderExists(nodeModulesPath)) {
        var files = fs.readdirSync(nodeModulesPath);
        Helper.each(files, function (file) {
            if (Helper.fileExists(path.join(nodeModulesPath, file, "package.json"))) {
                var json = require(path.join(nodeModulesPath, file, "package.json"));
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
        let moduleResolver = require("./module-resolver");
        moduleResolver.addModuleDirectory(Helper.BUILDER_DEPENDENCIES);
        require("rimraf").sync(dir);
        moduleResolver.removeModuleDirectory(Helper.BUILDER_DEPENDENCIES);
    }
};


Helper.getExternalModuleDirectories = function (project, addNodeModules, addOnlyParent) {
    var moduleDirectories = [];
    try {
        var builder = project.builderJs;
        let extDirectories = Helper.getEnvExternalModule().length > 0 ? Helper.getEnvExternalModule() : builder.externalModules && builder.externalModules.directories || [];
        if (builder.externalModules && ((builder.externalModules && builder.externalModules.enabled) || Helper.isActiveExternal()) &&
            extDirectories.length > 0) {
            let current = process.cwd();
            let currentType = builder.type;
            extDirectories.forEach((directory) => {
                try {
                    directory = directory.replace("~", os.homedir());
                    if (fs.statSync(directory).isDirectory()) {

                        let moduleTarget = directory;
                        let typeScriptOption = Helper.resolveTypescriptConfig(directory, "tsconfig.json", null);
                        if (typeScriptOption) {
                            let tscOutDir = typeScriptOption.compilerOptions || {};
                            tscOutDir = tscOutDir.outDir || undefined;
                            if (tscOutDir) {
                                moduleTarget = path.resolve(directory, tscOutDir);
                            }
                        }

                        moduleDirectories.push(moduleTarget);

                        if (addNodeModules) {
                            let nModules = path.resolve(path.join(directory, Helper.NODE_MODULES));
                            if (fs.existsSync(nModules) && fs.statSync(nModules).isDirectory()) {
                                moduleDirectories.push(nModules);
                            }
                        }

                        // on vérifie si des répertoires du 1er niveau sont des modules nodejs pour les ajouter eux aussi
                        var files = fs.readdirSync(directory);
                        files.forEach((file) => {
                            var modPath = path.join(directory, file);
                            if (fs.statSync(modPath).isDirectory()) {
                                if (file.indexOf(".") == 0) return;
                                // si un fichier "package.json" existe, c"est un module nodejs
                                if (fs.existsSync(path.join(modPath, "package.json"))) {
                                    let builderFile = path.join(modPath, Helper.BUILDER_FILE)
                                    if (fs.existsSync(builderFile)) {
                                        let path2addBuilderJS = Helper.ReadTypeBuilderJS(builderFile);
                                        if (path2addBuilderJS !== Helper.TYPE.APPLICATION && path2addBuilderJS !== Helper.TYPE.APPLICATION_SERVER || (currentType !== Helper.TYPE.APPLICATION && currentType !== Helper.TYPE.APPLICATION_SERVER && current === modPath)) {
                                            moduleDirectories.push(modPath);
                                            if (addNodeModules) {
                                                let nModules = path.resolve(path.join(modPath, Helper.NODE_MODULES));
                                                if (fs.existsSync(nModules) && fs.statSync(nModules).isDirectory()) {
                                                    moduleDirectories.push(nModules);
                                                }
                                            }
                                        } else {
                                            Helper.info("Exclusion : " + path2addBuilderJS);
                                        }
                                    }
                                }
                            }
                        });
                    }
                } catch (e) {
                    Helper.error("MODULE RESOLVER > erreur lors de la lecture du répertoire externe '" + directory + "' :", e);
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
            let parentBuilderFile = path.join(project.dir, "../", Helper.BUILDER_FILE)
            if (fs.existsSync(parentBuilderFile)) {
                let parentBuilderJs = require(parentBuilderFile);
                if (parentBuilderJs.type === Helper.TYPE.PARENT) {
                    moduleDirectories.push(path.resolve(project.dir, ".."));
                    if (!addOnlyParent) {
                        Helper.getModuleList(path.join(project.dir, "../"), project).forEach((module) => {
                            if ((project.packageJson.dependencies && project.packageJson.dependencies[module.name]) || (project.packageJson.devDependencies && project.packageJson.devDependencies[module.name])) {
                                let typeScriptOption = Helper.resolveTypescriptConfig(module.dir, "tsconfig.json", null);
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
    var externalDirectories = Helper.getExternalModuleDirectories(project);
    var modules = [];
    externalDirectories.forEach(function (dir) {
        var packageJsonPath = path.join(dir, "package.json");
        if (fs.existsSync(packageJsonPath)) {

            let typeScriptOption = Helper.resolveTypescriptConfig(dir, "tsconfig.json", null);
            let moduleTarget;
            if (typeScriptOption) {
                let tscOutDir = typeScriptOption.compilerOptions || {};
                tscOutDir = tscOutDir.outDir || undefined;
                if (tscOutDir) {
                    moduleTarget = path.resolve(dir, tscOutDir);
                }
            }

            var packageJson = require(packageJsonPath);
            modules.push({
                dir: dir,
                name: packageJson.name,
                version: packageJson.version,
                packageJson: packageJson,
                external: true,
                moduleTarget: moduleTarget
            });
        }
    });
    return modules;
};

Helper.applyExternalModuleDirectories = function (moduleResolver, project) {
    var externalModuleDirectories = Helper.getExternalModuleDirectories(project);
    externalModuleDirectories.forEach(function (dir) {
        Helper.info("MODULE RESOLVER > le répertoire '" + dir + "' est déclaré");
        moduleResolver.addModuleDirectory(dir);
    });

    let parentBuilderFile = path.join(project.dir, "../", Helper.BUILDER_FILE)
    if (fs.existsSync(parentBuilderFile)) {
        let parentBuilderJs = require(parentBuilderFile);
        if (parentBuilderJs.type === Helper.TYPE.PARENT) {
            moduleResolver.addModuleDirectory(path.join(project.dir, "../"));
        }
    }
};

Helper.requireUncached = function (module) {
    delete require.cache[require.resolve(module)];
    return require(module)
};

Helper.getCurrentProject = function () {
    return Helper.getProject(process.cwd());
};

Helper.ReadTypeBuilderJS = function (path) {
    let data = fs.readFileSync(path, 'utf8');
    let regex = /type:\s*["|'](\S+)["|']\s*/g;
    var corresp = regex.exec(data);
    return corresp && corresp[1]; // pour avoir un type avant d'installer le byuildDependencies
}

Helper.getProject = function (dir) {
    let packageJsonPath = path.join(dir, "package.json");
    let builderJsPath = path.join(dir, "builder.js");
    // FIXME : Currently, only default configuration is used (override done by configjs are not used)
    let configProjectPath = path.join(dir, "config", "default.js");
    if (!fs.existsSync(configProjectPath)) {
        configProjectPath = path.join(dir, "config", "default.json");
    }
    let builderJsType;

    if (!fs.existsSync(packageJsonPath) || !fs.existsSync(builderJsPath)) {
        Helper.error("Le projet doit avoir un fichier package.json et un fichier builder.js (dir=" + process.cwd() + ")");
        process.exit(1);
    }

    builderJsType = Helper.ReadTypeBuilderJS(builderJsPath)
    let moduleResolver = require("./module-resolver");
    moduleResolver.addModuleDirectory(dir);

    let packageJson = require(packageJsonPath);
    let configProject = {};
    if (builderJsType === Helper.TYPE.APPLICATION) {
        configProject = require(configProjectPath);
    }
    //retour arrière sur commit 187090, impossible à utiliser dans le cas ou le builder.js contient des requires
    //let builderJs = require(builderJsPath);
    let contextRoot;
    if (configProject) {
        contextRoot = configProject.contextPath;
    }

    let staticPath = "/" + (contextRoot || packageJson.name) + "/static-" + packageJson.version + "/";


    moduleResolver.removeModuleDirectory(dir);

    return {
        name: packageJson.name,
        version: packageJson.version,
        type: builderJsType,
        dir: dir,
        packageJson: packageJson,
        configJson: configProject,
        configJsonPath: configProjectPath,
        packageJsonPath: packageJsonPath,
        builderJs: builderJsPath,
        staticPath: staticPath,
        tsConfig: Helper.resolveTypescriptConfig(dir, "tsconfig.json", null)
    };
};

Helper.loadSubModuleTasks = function (project) {
    return new Promise(function (resolve, reject) {
        Helper.debug("chargement des taches du sous module : " + project.name);
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
    var cb = arguments[0];
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

Helper.checkTasksExistence = function (gulp, tasks) {
    tasks.forEach(function (task) {
        if (!gulp.hasTask(task)) {
            log(chalk.red("La tâche '" + task + "' n'existe pas"));
            process.exit(1);
        }
    });
};

Helper.isValidVersion = function (version, moduleName) {

    if (!semver.validRange(version)) {
        return false;
    } else {
        if (version.substring(0, 1).match("[~,>,>=,<,<=,=]") != null) {
            version = version.substring(1);
        }
    }


    // On autorise toute les versions release valide
    if (semver.prerelease(version) == null) {
        return (semver.validRange(version) != null);
    }
    else {
        if (semver.prerelease(Helper.getCurrentProject().version) != null) {
            return (semver.validRange(version) != null);
        } else {
            return false;
        }
    }
};

/**
 * Retourne la dépendance entre modules d'un projet dans un parent
 */
Helper.getModuleDependencies = function (project) {
    let ParentDir = path.resolve(project.dir, "../");
    let parentBuilderFile = path.join(ParentDir, Helper.BUILDER_FILE);
    if (fs.existsSync(parentBuilderFile)) {
        let parentBuilderJs = require(parentBuilderFile);
        if (parentBuilderJs.type === Helper.TYPE.PARENT) {
            Helper.debug("recherche des modules depuis : ", ParentDir);
            State.parentBuilder.externalModules = parentBuilderJs.externalModules;
            var moduleList = Helper.getModuleList(ParentDir);

            //Extraction des dépendances entre les modules
            moduleList.forEach(function (mod) {
                mod.dependencies = [];
                var json = mod.packageJson;
                var dep = json[Helper.DEPENDENCIES] || {};
                var testDep = json[Helper.DEV_DEPENDENCIES] || {};

                moduleList.forEach(function (dependent) {
                    if (dep[dependent.name] || testDep[dependent.name]) {
                        mod.dependencies.push(dependent.name);
                    }
                });
            });

            // on trie les modules de façon à gérer les inter-dépendances
            moduleList.sort(function (p1, p2) {
                return (p1.dependencies.indexOf(p2.name) != -1) ? -1 : 1
            });
            moduleList.sort(function (p1, p2) {
                return (p1.dependencies.indexOf(p2.name) != -1) ? -1 : 1
            });

            moduleList.reverse();
            Helper.debug("Modules trouvés :", moduleList);
            var subProjectTypes = {};
            let idxProject = moduleList.findIndex((mod) => {
                return mod.name === project.name;
            });
            let current = moduleList.splice(idxProject)[0];
            return moduleList.filter((mod) => {
                return current.dependencies.includes(mod.name);
            });
        }
    }

}

/**
 * Fonction retournant une fonction de mapping ajoutant les arguments avant ceux du tableau sur lequel s'applique le mapping
 * @param ...args les arguments à ajouter
 * @returns {Function}
 */
Helper.prepend = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    return function (element) {
        if (args.length === 1) {
            if (args[0] === "!") {
                return args[0] + element;
            } else {
                return path.join(args[0], element);
            }
        } else {
            return args.map(function (argElement) {
                return path.join(argElement, element);
            });
        }
    };
}

/**
 * Fonction copy de répertoire
 * @param src répertoire source
 * @param src répertoire destination
 */
Helper.copyDir = function (src, dest) {
    fs.mkdirSync(dest);
    var files = fs.readdirSync(src);
    for (var i = 0; i < files.length; i++) {
        var current = fs.lstatSync(path.join(src, files[i]));
        if (current.isDirectory()) {
            Helper.copyDir(path.join(src, files[i]), path.join(dest, files[i]));
        } else if (current.isSymbolicLink()) {
            var symlink = fs.readlinkSync(path.join(src, files[i]));
            fs.symlinkSync(symlink, path.join(dest, files[i]));
        } else {
            fs.copyFileSync(path.join(src, files[i]), path.join(dest, files[i]));
        }
    }
};

Helper.resolveTypescriptConfig = function (directory, configName, config) {
    let tsconfigFile = path.join(directory, configName);
    let actualConf = cloneDeep(config);

    if (fs.existsSync(tsconfigFile)) {
        let configTypescript = require(tsconfigFile);
        if (configTypescript && configTypescript.extends) {
            actualConf = merge(
                actualConf,
                Helper.resolveTypescriptConfig(path.resolve(directory, path.dirname(configTypescript.extends)), path.basename(configTypescript.extends) + ".json", actualConf)
            );
        }
        actualConf = merge(actualConf, configTypescript);
    }
    Helper.debug(directory, configName, `extend : ${actualConf ? actualConf.extends: null}`);
    return actualConf;
}

module.exports = Helper;