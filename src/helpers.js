"use strict";
var gutil = require("gulp-util");
var fs = require("fs");
var chalk = require("chalk");
var _ = require("lodash");
var os = require("os");
var path = require("path");
var semver = require("semver");
var promise = require("promise");
var eventStream = require("event-stream");
var JSON5 = require("json5");

var Helper = function () {
};

// Establish the object that gets returned to break out of a loop iteration.
var breaker = {};

var ArrayProto = Array.prototype, ObjProto = Object.prototype;
var slice = ArrayProto.slice, //
    nativeMap = ArrayProto.map, //
    nativeForEach = ArrayProto.forEach;

// Variables statiques stockant la valeur du répertoire d"installation des dépendances nodejs
Helper.NODE_MODULES = "node_modules";
Helper.NODE_MODULES_APP = path.join(Helper.NODE_MODULES, "app");
Helper.NODE_MODULES_TEST = path.join(Helper.NODE_MODULES, "buildntest");
Helper.TS_DEFINITIONS_DEPENDENCIES_PATH = "definition-ts";

// Variables statiques stockant le nom des clés des dépendances du package.json
Helper.TS_DEFINITIONS_DEPENDENCIES = "tsDefinitionDependencies";
Helper.APP_DEPENDENCIES = "appDependencies";
Helper.TEST_DEPENDENCIES = "buildAndTestDependencies";
Helper.HB_JSON_KEY= "____HORNET-BUILDER____DO_NOT_MODIFY_THIS_OBJECT____";

Helper.allowJSON5 = function() {
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
Helper.setDebug = function(value) {
    if (!_.isUndefined(value)) {
        process.env.IS_DEBUG_ENABLED = value;
    }
};
Helper.isDebug = function() {
    return process.env.IS_DEBUG_ENABLED || false;
};

Helper.setForce = function(value) {
    if (!_.isUndefined(value)) {
        process.env.IS_FORCE_ENABLED = value;
    }
};
Helper.isForce = function() {
    return process.env.IS_FORCE_ENABLED || false;
};

Helper.setRegistry = function(url) {
    if (!_.isUndefined(url)) {
        process.env.HB_RETRIEVE_REGISTRY = process.env.HB_PUBLISH_REGISTRY = url;
    }
};
Helper.setPublishRegistry = function(url) {
    if (!_.isUndefined(url)) {
        process.env.HB_PUBLISH_REGISTRY = url;
    }
};
Helper.getRegistry = function() {
    return process.env.HB_RETRIEVE_REGISTRY;
};
Helper.getPublishRegistry = function() {
    return process.env.HB_PUBLISH_REGISTRY;
};

Helper.setSkipTests = function(value) {
    if (!_.isUndefined(value)) {
        process.env.HB_SKIP_TESTS = value;
    }
};
Helper.isSkipTests = function() {
    return process.env.HB_SKIP_TESTS || false;
};

Helper.setSkipMinified = function(value) {
    if (!_.isUndefined(value)) {
        process.env.HB_SKIP_MINIFIED = value;
    }
};
Helper.isSkipMinified = function() {
    return process.env.HB_SKIP_MINIFIED || false;
};

Helper.setIDE = function(value) {
    if (!_.isUndefined(value)) {
        process.env.HB_IDE = value;
    }
};
Helper.isIDE = function() {
    return process.env.HB_IDE || false;
};

Helper.setShowWebPackFiles = function(value) {
    if (!_.isUndefined(value)) {
        process.env.HB_SHOW_WEBPACK_FILES = value;
    }
};
Helper.isShowWebPackFiles = function() {
    return process.env.HB_SHOW_WEBPACK_FILES || false;
};
Helper.setDebugPort = function(port) {
    if (!_.isUndefined(port)) {
        process.env.HB_DEBUG_PORT = port;
    }
};
Helper.getDebugPort = function() {
    return parseInt(process.env.HB_DEBUG_PORT);
};

Helper.setLintRules = function(rules) {
    if (!_.isUndefined(rules)) {
        process.env.HB_LINT_RULES = rules;
    }
};

Helper.getLintRules = function() {
    return process.env.HB_LINT_RULES;
};

Helper.setLintReport = function(report) {
    if (!_.isUndefined(report)) {
        process.env.HB_LINT_REPORT = report;
    }
};

Helper.getLintReport = function() {
    return process.env.HB_LINT_REPORT || "prose";
};

Helper.logBuilderModes = function() {
    Helper.debug("Mode DEBUG [ON]");
    Helper.debug("Mode IDE:", (Helper.isIDE() ? "[ON]" : "[OFF]"));
    Helper.debug("Mode FORCE:", (Helper.isForce() ? "[ON]" : "[OFF]"));
    Helper.debug("Mode ShowWebPackFiles:", (Helper.isShowWebPackFiles() ? "[ON]" : "[OFF]"));
    Helper.debug("Mode SkipTests:", (Helper.isSkipTests() ? "[ON]" : "[OFF]"));
    Helper.debug("Mode SkipMinified:", (Helper.isSkipMinified() ? "[ON]" : "[OFF]"));
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
        gutil.log.call(gutil, argsWithColors);
    }
};

Helper.info = function () {
    gutil.log.apply(gutil, Helper.processLogArgs(arguments));
};

Helper.warn = function () {
    var argsWithColors = chalk.bgYellow.apply(chalk, ["[WARN]"].concat(Helper.processLogArgs(arguments)));
    gutil.log.call(gutil, argsWithColors);
};

Helper.error = function () {
    var argsWithColors = chalk.red.apply(chalk, ["[ERROR]"].concat(Helper.processLogArgs(arguments)));
    gutil.log.call(gutil, argsWithColors);
};

Helper.processLogArgs = function (args) {
    //Les objets ne sont pas stringifiés avec chalk donc c'est fait main :(
    var processedArgs = _.map(args, function (arg) {
        if (_.isObject(arg)) {
            return [os.EOL, JSON.stringify(arg, null, 2)];
        } else {
            return arg;
        }
    });

    return _.flatten(processedArgs);
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


Helper.getModuleList = function(dir) {
    var moduleList = [];
    var builderPath = path.join(dir, "builder.js");
    if (fs.existsSync(builderPath)) {
        var builder = require(builderPath);
        if (builder && builder.type == "parent") {
            Helper.readDirRecursiveAndCallBackOnDir(dir, function (dir, file) {
                var packagePath = path.join(dir, file, "package.json");
                var builderJsPath = path.join(dir, file, "builder.js");
                if (!fs.existsSync(packagePath) || !fs.existsSync(builderJsPath)) {
                    // pas de package.json, pas un module
                    return false;
                }
                var packageDef = require(packagePath);

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
Helper.sortObj = function(obj, cmp) {
    var r = [];
    for (var i in obj)
        if (obj.hasOwnProperty(i)) r.push({key: i, value: obj[i]});

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
Helper.getLastVersion = function(versions) {
    var lastVersion = versions[0];
    var semver = require("semver");
    for (var i = 0; i < versions.length; i++) {
        for (var j = i + 1; j < versions.length; j++) {
            if (semver.lt(lastVersion, versions[j])) {
                lastVersion = versions[j];
            }
        }
    }
    return lastVersion;
};

Helper.getDependenciesHash = function(module) {
    var deps = {};
    var dependencies = module[Helper.APP_DEPENDENCIES] || module.dependencies || {};
    Object.keys(dependencies).forEach(function(name) {
        deps[name] = dependencies[name];
    });
    deps = Helper.sortObj(deps);
    return require("object-hash")(deps);
};

/**
 * Calcule le rapport de dépendances d'un module en prenant en compte les dépendances fixées
 * @param npm
 * @param root
 * @param resolved
 * @param cb
 * @returns {void}
 */
Helper.getDependenciesReport = function(npm, root, resolved, cb) {
    var report = {};
    var N = 0, i = 0;
    var seen = {};

    function getModuleReport(module) {
        var moduleReport = {
            name: module.name,
            version: module.version,
            deps: {},
            deps2: {},
            hash: null,
            fixed: {}
        };
        var dependencies = module[Helper.APP_DEPENDENCIES] || module.dependencies || {};
        Object.keys(dependencies).forEach(function(name) {
            moduleReport.deps[name] = dependencies[name];
        });
        moduleReport.hash = Helper.getDependenciesHash(module);

        var hbj = module[Helper.HB_JSON_KEY] || {},
            hbj_history = hbj.history || {},
            hbj_hashdeps = hbj_history[moduleReport.hash] || null,
            hbj_hashdeps_current = hbj_history[hbj.current || ""] || {};

        moduleReport.fixed = (hbj_hashdeps || hbj_hashdeps_current).deps || {};
        return moduleReport;
    }

    function readDependency(name, version, cb){
        if(!version) version = '*';

        if (name in resolved && version == resolved[name].version) {
            i++;
            cb(resolved[name].packageJson);
        } else {
            npm.commands.cache.read(name, version, false, function (err, resolvedPackage) {
                i++;
                if (!err && resolvedPackage) {
                    cb(resolvedPackage);
                } else {
                    Helper.error("Dépendance introuvable '" + name + "@" + version + "'");
                    throw err;
                }
            });
        }
    }

    function mergeFixed(to, from) {
        var to2 = Object.create(to);
        Object.keys(from).forEach(function(fixed) {
            if (!(fixed in to2)) to2[fixed] = from[fixed];
        });
        return to2;
    }

    function walk(module, fixed) {
        if (seen[module.name + "@" + module.version]) return;
        seen[module.name + "@" + module.version] = true;

        var moduleReport = getModuleReport(module);

        if (!(module.name in report)) report[module.name] = {};
        report[module.name][module.version] = moduleReport;

        fixed = mergeFixed(fixed, moduleReport.fixed);

        Object.keys(moduleReport.deps || {}).forEach(function (dep) {
            N++;
            var version = fixed[dep] ? fixed[dep] : moduleReport.deps[dep];
            readDependency(dep, version, function (dependency) {
                moduleReport.deps2[dep] = {};
                moduleReport.deps2[dep][dependency.version] = version;
                walk(dependency, fixed);
            })
        });

        return moduleReport;
    }

    walk(root, getModuleReport(root).fixed);

    // attente de la fin des traitements asynchrones
    var t = setInterval(function() {
        if (i >= N) {
            clearInterval(t);
            cb(Helper.sortObj(report));
        }
    }, 100);
};

/**
 * Renvoie les dépendances finales à installer
 * @param report
 * @param root
 * @returns {object}
 */
Helper.getFinalDependencies = function(report, root) {
    var dependencies = {};
    var merged = Helper.mergeReportDependencies(root, report);
    Helper.forEach2Depth(merged, function(name, version) {
        if (name == root.name && version == root.version) return;
        dependencies[name] = version;
    });
    return dependencies;
};

/**
 * Inverse le rapport de dépendances
 * @param root
 * @param report
 * @returns {object}
 */
Helper.mergeReportDependencies = function(root, report) {
    var merged = {};
    function add(name, version, versionQ, issuer) {
        if (!merged[name]) merged[name] = {};
        if (!merged[name][version]) merged[name][version] = {};
        merged[name][version][issuer] = versionQ;
    }
    function walk(module) {
        Object.keys(report[module.name][module.version].deps2).forEach(function(moduleName) {
            Object.keys(report[module.name][module.version].deps2[moduleName]).forEach(function(moduleVersion) {
                add(moduleName, moduleVersion, report[module.name][module.version].deps2[moduleName][moduleVersion], module.name+'@'+module.version);
                walk({name: moduleName, version: moduleVersion});
            });
        });
    }
    walk(root);

    // on filtre les deps restantes pour ne garder que la plus grande version
    Helper.forEach1Depth(merged, function(name) {
        var versions = Object.keys(merged[name]);
        if (versions.length > 1) {
            var lastVersion = Helper.getLastVersion(versions);
            var save = merged[name][lastVersion];
            Helper.debug("Sélection de la plus grande version pour la dépendence '" + name + "' : '" + lastVersion + "' (" + JSON.stringify(merged[name], null, 2) + ")");
            merged[name] = {};
            merged[name][lastVersion] = save;
        }
    });
    return merged;
};

Helper.forEach3Depth = function(obj, cb) {
    Object.keys(obj || {}).forEach(function(key1) {
        Object.keys(obj[key1] || {}).forEach(function (key2) {
            Object.keys(obj[key1][key2] || {}).forEach(function (key3) {
                cb(key1, key2, key3, obj[key1][key2][key3]);
            });
        });
    });
};
Helper.forEach2Depth = function(obj, cb) {
    Object.keys(obj || {}).forEach(function(key1) {
        Object.keys(obj[key1] || {}).forEach(function (key2) {
            cb(key1, key2, obj[key1][key2]);
        });
    });
};
Helper.forEach1Depth = function(obj, cb) {
    Object.keys(obj || {}).forEach(function(key1) {
        cb(key1, obj[key1]);
    });
};

Helper.cleanObj = function(obj) {
    Helper.forEach1Depth(obj, function(key) {
        if (Object.keys(obj[key]).length == 0) delete obj[key];
    });
};

/**
 * Retourne le path du cache en l'ayant créé auparavant
 * @returns {*}
 */
Helper.findCacheFolder = function() {
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
Helper.getCachePathfolders = function() {
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

/**
 * Installe une dépendance app dans un répertoire spécifique (décompactage sans sous-dépendances)
 * @param npm
 * @param dependencyName
 * @param dependencyVersion
 * @param targetDir
 */
Helper.installAppDependency = function(npm, dependencyName, dependencyVersion, targetDir, resolvedFromParent) {
    return new promise(function(resolve, reject) {
        var up = npm.config.get("unsafe-perm");
        var user = up ? null : npm.config.get("user");
        var group = up ? null : npm.config.get("group");
        npm.commands.cache.unpack(dependencyName, dependencyVersion, targetDir, null, null, user, group, function (err) {
            if (err) {
                Helper.error("Erreur durant l'installation de la dépendance '" + dependencyName + "@" + dependencyVersion + "' dans le répertoire '" + targetDir + "' : ", err);
                reject(err);
            }
            else resolve()
        });
    });
};

/**
 * Installe une dépendance de test dans un répertoire spécifique avec instalallation des sous-dépendances
 * @param npm
 * @param dependencyName
 * @param dependencyVersion
 * @param tempDir
 * @param targetDir
 */
Helper.installTestDependency = function(npm, dependencyName, dependencyVersion, tempDir, targetDir) {

    return new promise(function(resolve, reject) {
        var oldPrefix = npm.prefix;
        npm.prefix = tempDir;
        npm.commands.install.Installer.prototype.printInstalled = function (cb) {
            cb();
        };
        npm.commands.install(tempDir, [dependencyName + "@" + dependencyVersion], function (err, result) {
            if (err) {
                Helper.error("Erreur durant l'installation de la dépendance '" + dependencyName + "@" + dependencyVersion + "' dans le répertoire temporaire '" + tempDir + "' : ", err);
                reject(err);
            } else {
                if (!Helper.folderExists(path.join(tempDir, Helper.NODE_MODULES, dependencyName, Helper.NODE_MODULES))) {
                    fs.mkdirSync(path.join(tempDir, Helper.NODE_MODULES, dependencyName, Helper.NODE_MODULES));
                }
                var dirs = fs.readdirSync(path.join(tempDir, Helper.NODE_MODULES));
                Helper.each(dirs, function (dir) {
                    if (dir != dependencyName) {
                        fs.renameSync(path.join(tempDir, Helper.NODE_MODULES, dir), path.join(tempDir, Helper.NODE_MODULES, dependencyName, Helper.NODE_MODULES, dir));
                    }
                });

                //fs.renameSync(path.join(tempDir, Helper.NODE_MODULES, dependencyName), targetDir);
                /////////////////////////////////////////////////////////
                // Tout ce code juste pour déplacer un répertoire ...  //
                var gulp = require("gulp");
                Helper.stream(
                    function() {
                        Helper.removeDir(path.join(tempDir, Helper.NODE_MODULES, dependencyName));
                        npm.prefix = oldPrefix;
                        resolve();
                    },
                    gulp.src(path.join(tempDir, Helper.NODE_MODULES, dependencyName, "**/*"))
                        .pipe(gulp.dest(targetDir))
                );
                /////////////////////////////////////////////////////////
            }
        });
    });
};

Helper.readInstalledDependencies = function(nodeModulesPath) {
    var installed = {};
    if (Helper.folderExists(nodeModulesPath)) {
        var files = fs.readdirSync(nodeModulesPath);
        Helper.each(files, function (file) {
            var json = require(path.join(nodeModulesPath, file, "package.json"));
            installed[json.name] = json.version;
        });
    }
    return installed;
};


Helper.getInstalledAppDependencies = function(rootPath, resolvedFromParent) {
    var installed = Helper.readInstalledDependencies(path.join(rootPath, Helper.NODE_MODULES_APP));
    Object.keys(resolvedFromParent).forEach(function(name) {
        installed[name] = resolvedFromParent[name].version;
    });
    return installed;
};


Helper.getInstalledTestDependencies = function(rootPath) {
    return Helper.readInstalledDependencies(path.join(rootPath, Helper.NODE_MODULES_TEST));
};

/**
 * Supprime un répertoire et tous ses sous-répertoires
 * @param dir
 */
Helper.removeDir = function(dir) {
    if (Helper.folderExists(dir)) {
        require("rimraf").sync(dir, function (err) {
            Helper.error("Erreur pour supprimer le répertoire '" + dir + "' : ", err);
            throw err;
        });
    }
};


Helper.getExternalModuleDirectories = function(project) {
    var moduleDirectories = [];
    try {
        var builder = project.builderJs;
        if (builder.externalModules && builder.externalModules.enabled &&
            builder.externalModules.directories &&
            builder.externalModules.directories.length > 0) {

            builder.externalModules.directories.forEach(function(directory) {
                try {
                    if (fs.statSync(directory).isDirectory()) {
                        moduleDirectories.push(directory);

                        // on vérifie si des répertoires du 1er niveau sont des modules nodejs pour les ajouter eux aussi
                        var files = fs.readdirSync(directory);
                        files.forEach(function (file) {
                            var modPath = path.join(directory, file);
                            if (fs.statSync(modPath).isDirectory()) {
                                if (file.indexOf(".") == 0) return;

                                // si un fichier "package.json" existe, c"est un module nodejs
                                if (fs.existsSync(path.join(modPath, "package.json"))) {
                                    moduleDirectories.push(modPath);
                                }
                            }
                        });
                    }
                } catch (e) {
                    console.error("MODULE RESOLVER > erreur lors de la lecture du répertoire externe '" + directory + "' :", e);
                    process.exit(1);
                }
            });
        }

        Helper.getModuleList(path.join(project.dir, "../")).forEach(function(module) {
            moduleDirectories.push(module.dir);
        });
    } catch(e) {
        // pas de fichier 'builder.js' >> mode production
        // on ignore en silence
    }
    return moduleDirectories;
};

Helper.getExternalModules = function(project) {
    var externalDirectories = Helper.getExternalModuleDirectories(project);
    var modules = [];
    externalDirectories.forEach(function(dir) {
        var packageJsonPath = path.join(dir, "package.json");
        if (fs.existsSync(packageJsonPath)) {
            var packageJson = require(packageJsonPath);
            modules.push({
                dir: dir,
                name: packageJson.name,
                version: packageJson.version,
                packageJson: packageJson
            });
        }
    });
    return modules;
};

Helper.applyExternalModuleDirectories = function(moduleResolver, project) {
    var externalModuleDirectories = Helper.getExternalModuleDirectories(project);
    externalModuleDirectories.forEach(function(dir) {
        Helper.info("MODULE RESOLVER > le répertoire '" + dir + "' est déclaré");
        moduleResolver.addModuleDirectory(dir);
    });
};

Helper.requireUncached = function(module) {
    delete require.cache[require.resolve(module)]
    return require(module)
};

Helper.getCurrentProject = function() {
    return Helper.getProject(process.cwd());
};

Helper.getProject = function(dir) {
    var packageJsonPath = path.join(dir, "package.json");
    var builderJsPath = path.join(dir, "builder.js");

    if (!fs.existsSync(packageJsonPath) || !fs.existsSync(builderJsPath)) {
        Helper.error("Le projet doit avoir un fichier package.json et un fichier builder.js (dir=" + process.cwd() + ")");
        process.exit(1);
    }
    var packageJson = require(packageJsonPath);
    //var builderJs = require(builderJsPath);

    return {
        name: packageJson.name,
        version: packageJson.version,
        //type: builderJs.type,
        dir: dir,
        packageJson: packageJson,
        //builderJs: builderJs
    };
};

Helper.loadSubModuleTasks = function(project) {
    var promise = require("promise");
    return new promise(function(resolve, reject) {
        Helper.debug("chargement des taches du sous module : " + project.name);
        Helper.setCurrentSubModule(project);
        require("./builders-loader")(project, function() {
            Helper.setCurrentSubModule(null);
            resolve();
        });
    });
};

Helper.setCurrentSubModule = function(project) {
    this.currentSubModule = project;
    if (project) {
        process.chdir(project.dir);
    }
};


Helper.getCurrentSubModule = function() {
    return this.currentSubModule;
};

/**
 *
 * @param done gulp task done callback
 * @param streams streams to merge
 * @returns {EventEmitter}
 */
Helper.stream = function(done, streams) {
    var cb = arguments[0];
    return eventStream.merge.apply(eventStream, [].slice.call(arguments, 1)).on("end", function() { cb(); });
};


Helper.npmPublish = function(npm, rootPath, done) {
    var oldRegistry = npm.config.get("registry");
    if (Helper.getPublishRegistry()) npm.config.set("registry", Helper.getPublishRegistry());
    npm.config.set("force", "true");
    npm.commands.publish([rootPath], function (err) {
        npm.config.set("registry", oldRegistry);
        npm.config.set("force", "false");
        if (err) {
            Helper.error("Erreur 'publish' : ", err);
        }
        done(err);
    });
};

Helper.npmUnpublish = function(npm, name, version, done) {
    var oldRegistry = npm.config.get("registry");
    if (Helper.getPublishRegistry()) npm.config.set("registry", Helper.getPublishRegistry());
    npm.config.set("force", "true");
    npm.commands.unpublish([name+"@"+version], function (err) {
        npm.config.set("registry", oldRegistry);
        npm.config.set("force", "false");
        if (err) {
            Helper.error("Erreur 'unpublish' :", err);
        }
        done(err);
    });
};

Helper.checkTasksExistence = function(gulp, tasks) {
    tasks.forEach(function(task) {
        if (!gulp.hasTask(task)) {
            gutil.log(chalk.red("La tâche '" + task + "' n'existe pas"));
            process.exit(1);
        }
    });
};

Helper.isValidVersion = function(version) {
    // TODO: remplacer par un meilleur test style 'semver'
    return version.match(/^[0-9]/) && version.indexOf("*") == -1;
};

Helper.checkOrInstallBuildAndTestDependencies = function(project, npm, cb) {
    if (!checkBuildAndTestDependencies(project)) {
        process.exit(1);
    }

    if (detectBuildAndTestDependenciesChanges(project)) {
        installBuildAndTestDependencies(project, npm, cb);
    } else {
        cb();
    }
};

function checkBuildAndTestDependencies(project) {
    var root = project.packageJson;
    var ok = true;
    Helper.each(root[Helper.TEST_DEPENDENCIES], function(version, key) {
        if (!Helper.isValidVersion(version)) {
            ok = false;
            Helper.error("Version '" + version + "' interdite pour la dépendance de build/test '" + key + "' ==> vous devez utiliser une version figée");
        }
    });
    return ok;
}

function detectBuildAndTestDependenciesChanges(project) {
    var root = project.packageJson;
    var installedTestDependencies = Helper.getInstalledTestDependencies(project.dir);
    var diff = false;
    if (!(Helper.TEST_DEPENDENCIES in root) || Object.keys(root[Helper.TEST_DEPENDENCIES]).length == 0) {

        Helper.debug("Aucune dépendances de build/test > rien à faire");
    } else {
        if (!Helper.folderExists(path.join(project.dir, Helper.NODE_MODULES)) ||
            !Helper.folderExists(path.join(project.dir, Helper.NODE_MODULES_TEST))) {

            Helper.info(chalk.green("Dépendances de build/test à installer avant la 1ère exécution du builder"));
            diff = true;
        } else if (Helper.isForce()) {

            Helper.debug("Dépendances de build/test à réinstaller en force");
            diff = true;
        } else {
            Helper.each(installedTestDependencies, function(version, name) {
                if (!(name in root[Helper.TEST_DEPENDENCIES])) {
                    diff = true;
                    Helper.info(chalk.green("Dépendances de build/test installée à supprimer : '" + name + "@" + version + "'"));

                } else if (root[Helper.TEST_DEPENDENCIES][name] != version) {
                    diff = true;
                    Helper.info(chalk.green("Dépendances de build/test installée dans une version différente : '" + name + "@" + version + "' > version attendue '" + root[Helper.TEST_DEPENDENCIES][name] + "'"));
                }
            });
            Helper.each(root[Helper.TEST_DEPENDENCIES], function(version, name) {
                if (!(name in installedTestDependencies)) {
                    diff = true;
                    Helper.info(chalk.green("Dépendances de build/test non installée : '" + name + "@" + version + "'"));
                }
            });
            if (diff) {
                Helper.debug("Modification détectée sur les dépendances de build/test > on synchronise");
            } else {
                Helper.debug("Dépendances de build/test à jour > rien à faire (si ce n'est pas le cas ajouter l'option -f pour forcer la réinstallation des dépendances)");
            }
        }
    }
    return diff;
}

function installBuildAndTestDependencies(project, npm, done) {
    var root = project.packageJson;
    var rootStr = root.name + '@' + root.version;
    var dependencies = root[Helper.TEST_DEPENDENCIES] || {};
    var toRemove = {}, toInstall = {}, toUpdate = {};

    // on analyse ce qu'il y a à supprimer / installer
    var installedDependencies = Helper.getInstalledTestDependencies(project.dir);
    Helper.each(installedDependencies, function(version, name) {
        if (!(name in dependencies)) {
            toRemove[name] = version;
        } else if (version != dependencies[name]) {
            toUpdate[name] = version;
        }
    });
    Helper.each(dependencies, function(version, name) {
        if (!(name in installedDependencies)) {
            toInstall[name] = version;
        }
    });
    toRemove = Helper.sortObj(toRemove);
    toUpdate = Helper.sortObj(toUpdate);
    toInstall = Helper.sortObj(toInstall);

    Helper.debug("Dépendances de build/test à supprimer : ", toRemove);
    Helper.debug("Dépendances de build/test à mettre à jour : ", toUpdate);
    Helper.debug("Dépendances de build/test à installer : ", toInstall);

    // on créé les répertoires si besoin
    if (Object.keys(toInstall).length > 0) {
        if (!Helper.folderExists(Helper.NODE_MODULES)) {
            fs.mkdirSync(Helper.NODE_MODULES);
        }
        if (!Helper.folderExists(Helper.NODE_MODULES_TEST)) {
            fs.mkdirSync(Helper.NODE_MODULES_TEST);
        }
    }

    // suppression des dépendances installées inutiles
    Helper.each(toRemove, function(version, name) {
        Helper.info("Suppression de la dépendance de build/test installée '" + name + "@" + version + "' car inutile");
        Helper.removeDir(path.join(project.dir, Helper.NODE_MODULES_TEST, name));
    });

    var tempDir = path.join(Helper.findCacheFolder(), "__tmp");
    if (Helper.folderExists(tempDir)) {
        Helper.removeDir(tempDir);
        fs.mkdirSync(tempDir);
    }
    // suppression des dépendances à mettre à jour
    Helper.each(toUpdate, function(version, name) {
        var modulePath = path.join(project.dir, Helper.NODE_MODULES_TEST, name);
        Helper.info("Suppression de la dépendance de build/test installée '" + name + "@" + version + "' car à mettre à jour en version '" + dependencies[name] + "'");
        Helper.removeDir(modulePath);
        Helper.installTestDependency(npm, name, dependencies[name], tempDir, path.join(Helper.NODE_MODULES_TEST, name))
    });

    var myPromise = promise.resolve();
    var idx = 0, nDeps = Object.keys(toInstall).length;
    // installation des nouvelles dépendances de test
    Helper.each(toInstall, function(version, name) {
        myPromise = myPromise.then(function(resolve, reject) {
            Helper.info("Installation de la dépendance de build/test " + (++idx) + "/" + nDeps + " : '" + name + "@" + version + "'");
            return Helper.installTestDependency(npm, name, dependencies[name], tempDir, path.join(Helper.NODE_MODULES_TEST, name));
        });
    });
    myPromise.catch(function(err) {
        Helper.error("Erreur durant l'installation des dépendances de build/test : " + err);
        process.exit(1);
    });
    myPromise = myPromise.then(function(resolve) { done(); });
}


Helper.excludeNodeModulesFromWebpack = function(modulesName, webpackConfiguration) {
    var regexps = [];
    modulesName.forEach(function(moduleName) {
        regexps.push(new RegExp(path.normalize(path.join(Helper.NODE_MODULES_APP, moduleName, ".*$")).replace(/\\/g,"\\\\")));
    });

    if (!webpackConfiguration.module.noParse || !_.isArray(webpackConfiguration.module.noParse)) {
        webpackConfiguration.module.noParse = [];
    }

    regexps.forEach(function(regexp) {
        webpackConfiguration.module.noParse.push(regexp);
    })
};

Helper.excludeLocalFilesFromWebpack = function(fileNames, webpackConfiguration) {
    var regexps = [];
    fileNames.forEach(function(fileName) {
        regexps.push(new RegExp(path.normalize(path.join(fileName, ".*$")).replace(/\\/g,"\\\\")));
    });

    if (!webpackConfiguration.module.noParse || !_.isArray(webpackConfiguration.module.noParse)) {
        webpackConfiguration.module.noParse = [];
    }

    regexps.forEach(function(regexp) {
        webpackConfiguration.module.noParse.push(regexp);
    })
};

module.exports = Helper;
