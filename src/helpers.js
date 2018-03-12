"use strict";
const gutil = require("gulp-util");
const fs = require("fs");
const chalk = require("chalk");
const _ = require("lodash");
const os = require("os");
const path = require("path");
const semver = require("semver");
const eventStream = require("event-stream");
const JSON5 = require("json5");
const State = require("./builders/state");


var Helper = function () {
};

var oldCLog = console.log;


// Establish the object that gets returned to break out of a loop iteration.
var breaker = {};
var dockerOpts;
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
    THEME: "theme",
    CUSTOM: "custom",
    COMPOSANT: "composant"
}

Helper.RELEASE_TYPE = {
    FINAL: "final",
    SNAPSHOT: "snapshot"
}

// Variables statiques stockant la valeur du répertoire d"installation des dépendances nodejs
Helper.NODE_MODULES = "node_modules";
Helper.NODE_MODULES_APP = path.join(Helper.NODE_MODULES, "app");
Helper.NODE_MODULES_TEST = path.join(Helper.NODE_MODULES, "test");
Helper.NODE_MODULES_BUILD = path.join(Helper.NODE_MODULES, "build");
Helper.NODE_MODULES_TMP = path.join(Helper.NODE_MODULES, "tmp");
Helper.TS_DEFINITIONS_DEPENDENCIES_PATH = "definition-ts";
Helper.BUILDER_DEPENDENCIES = path.join(__dirname, "..", Helper.NODE_MODULES);

// Variables statiques stockant le nom des clés des dépendances du package.json
Helper.TS_DEFINITIONS_DEPENDENCIES = "tsDefinitionDependencies";
Helper.APP_DEPENDENCIES = "appDependencies";
Helper.TEST_DEPENDENCIES = "testDependencies";
Helper.BUILD_DEPENDENCIES = "buildDependencies";
Helper.HB_JSON_KEY = "____HORNET-BUILDER____DO_NOT_MODIFY_THIS_OBJECT____";

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
    if (!_.isUndefined(value)) {
        process.env.IS_DEBUG_ENABLED = value;
    }
};

Helper.setCommandArgs = function (value) {
    args = value;
}

Helper.getCommandArgs = function () {
    return args;
}

Helper.setDocker = function (value) {
    dockerOpts = value;

    if (!_.isUndefined(value)) {
        if (value == true) {
            dockerOpts = {};
            dockerOpts["cmd"] = "run";
        } else {
            var opts = value.split(',');
            dockerOpts = {};
            for (var i = 0; i < opts.length; i++) {
                if (opts[i] !== undefined) {
                    var property = opts[i].split('=')[0];
                    var val = opts[i].split('=')[1];
                    dockerOpts[property] = val;
                }
            }
        }
    }
};

Helper.getDocker = function () {
    return dockerOpts;
};

Helper.setList = function (value) {

    if (!_.isUndefined(value)) {
        Helper.info("Listing de toutes les tâches du builder"

            + "\n\n Tâches de gestion des dépendances"
            + "\n " + chalk.blue.bold("dependencies:clean-build             ") + " | supprime les dépendances de construction/test (répertoire node_modules/buildntest)"
            + "\n " + chalk.blue.bold("dependencies:clean-all               ") + " | supprime toutes les dépendances"
            + "\n " + chalk.blue.bold("dependencies:clean-fix               ") + " | supprime toutes les dépendances fixées, à utiliser avec l'option -f"
            + "\n " + chalk.blue.bold("dependencies:check-app               ") + " | vérifie la conformité des versions des dépendances applicatives déclarées"
            + "\n " + chalk.blue.bold("dependencies:check-ts-definition     ") + " | vérifie la conformité des versions des fichiers de définition Typescript"
            + "\n " + chalk.blue.bold("dependencies:change-app              ") + " | vérifie si les dépendances applicatives ont été modifiées | dependencies:check-app"
            + "\n " + chalk.blue.bold("dependencies:fix-app                 ") + " | Calcule l'arbre de dépendances applicatives et fixe les versions des dépendances transitives déclarées avec un ^, ~ ou * | dependencies:change-app"
            + "\n " + chalk.blue.bold("dependencies:install-ts-definition   ") + " | Installe les fichiers de définition | dependencies:check-ts-definition"
            + "\n " + chalk.blue.bold("dependencies:install-app             ") + " | Installe les dépendances applicatives | dependencies:fix-app"
            + "\n " + chalk.blue.bold("dependencies:install-test            ") + " | Installe les dépendances de test"
            + "\n " + chalk.blue.bold("dependencies:install-app-themes      ") + " | Installe des dépendances de thème embarqué"
            + "\n " + chalk.blue.bold("dependencies:install-community-themes") + " | Installe des dépendances de thème liés à hornet-js-community"
            + "\n " + chalk.blue.bold("dependencies:install                 ") + " | Installe les dépendances applicatives et les fichiers de définitions | dependencies:install-ts-definition, dependencies:install-buildntest, dependencies:install-app"
            + "\n " + chalk.blue.bold("install                              ") + " | Alias de 'dependencies:install' | dependencies:install"



            + "\n\n Tâches de compilation"
            + "\n " + chalk.blue.bold("compile:ts                           ") + " | Transpile les sources TS en Javascript. S'exécute uniquement si l'option '-i' (--ide) n'est pas utilisée | clean"
            + "\n " + chalk.blue.bold("compile                              ") + " | Transpile les sources TS en Javascript. | dependencies:install et compile:ts"


            + "\n\n Tâches de test"
            + "\n " + chalk.blue.bold("prepare:testSources                  ") + " | Copie les sources originales et compilées dans le répertoire de travail des tests : istanbul | compile"
            + "\n " + chalk.blue.bold("test:instrument                      ") + " | Défini les instruments de couverture de code sur les sources | prepare:testSources"
            + "\n " + chalk.blue.bold("test                                 ") + " | Exécute les tests unitaires et la mesure de couverture de code | dependencies:install et test:instrument"


            + "\n\n Tâches de nettoyage"
            + "\n " + chalk.blue.bold("clean:test                           ") + " | Supprime le dossier istanbul ainsi que les fichiers générés (.js, .map et .d.ts dans le dossier de tests)"
            + "\n " + chalk.blue.bold("clean                                ") + " | Supprime les fichiers générés (.js, .map et .d.ts dans le dossier de sources) | clean:test"
            + "\n " + chalk.blue.bold("clean-all                            ") + " | Supprime tous les fichiers et dépendances | clean, dependencies:clean-all"

            + "\n\n Tâches de construction"
            + "\n " + chalk.blue.bold("prepare-package                      ") + " | Lance WebPack pour la construction du js client  (mode debug)"
            + "\n " + chalk.blue.bold("prepare-package-spa                  ") + " | Lance WebPack pour la construction du js client  (mode spa)"
            + "\n " + chalk.blue.bold("prepare-package:minified             ") + " | Lance WebPack avec la minification pour la construction du js client"
            + "\n " + chalk.blue.bold("prepare-package:spa                  ") + " | Prépare les fichiers à packager pour un projet en FullSpa"
            + "\n " + chalk.blue.bold("package-zip-static                   ") + " | Construit le livrable statique | prepare-package:minified"
            + "\n " + chalk.blue.bold("package-zip-dynamic                  ") + " | Construit le livrable dynamique | prepare-package:minified"
            + "\n " + chalk.blue.bold("package                              ") + " | Lance les tests puis construit tous les livrables | test, package-zip-static et package-zip-dynamic"
            + "\n " + chalk.blue.bold("package:spa                          ") + " | Lance les tests puis construit tous les livrables spa | "


            + "\n\n Tâches de watch"
            + "\n " + chalk.blue.bold("watch:ts                             ") + " | Ecoute les modifications sur les fichiers TS et les recompile à la volée. S'exécute uniquement si l'option '-i' (--ide) n'est pas utilisée"
            + "\n " + chalk.blue.bold("watch:serveur                        ") + " | Ecoute les modifications sur les fichiers et redémarre le serveur node pour les prendre en compte. Démarre nodejs en mode development | watch:ts"
            + "\n " + chalk.blue.bold("watch:serveur-prod                   ") + " | Equivalent à watch:serveur mais avec nodejs en mode production | watch:ts"
            + "\n " + chalk.blue.bold("watch:client                         ") + " | Ecoute les modifications sur les fichiers et relance WebPack à la volée. Lance WebPack en mode development. | watch:ts"
            + "\n " + chalk.blue.bold("watch:client-prod                    ") + " | Equivalent à watch:client mais avec WebPack en mode production | watch:ts"
            + "\n " + chalk.blue.bold("watch                                ") + " | Compile et écoute les modifications pour redémarrer nodejs et relancer WebPack si besoin. mode : development | compile, watch:client et watch:serveur"
            + "\n " + chalk.blue.bold("watch-prod                           ") + " | Compile et écoute les modifications pour redémarrer nodejs et relancer WebPack si besoin. mode : production  | compile, watch:client-prod et watch:serveur-prod"
            + "\n " + chalk.blue.bold("w                                    ") + " | Alias de 'watch' | watch"
            + "\n " + chalk.blue.bold("wp                                   ") + " | Alias de 'watch-prod' | watch-prod"

            + "\n\n Tâches de qualimétrie"
            + "\n " + chalk.blue.bold("lint                                 ") + " | Lance le tslint sur les sources ts (qualité de code)");
        process.exit(1);
    }
};
Helper.isDebug = function () {
    return process.env.IS_DEBUG_ENABLED ? true : false;
};

Helper.setForce = function (value) {
    if (!_.isUndefined(value)) {
        process.env.IS_FORCE_ENABLED = value;
    }
};
Helper.isForce = function () {
    return process.env.IS_FORCE_ENABLED || false;
};

Helper.setRegistry = function (url) {
    if (!_.isUndefined(url)) {
        process.env.HB_RETRIEVE_REGISTRY = process.env.HB_PUBLISH_REGISTRY = url;
    }
};
Helper.setPublishRegistry = function (url) {
    if (!_.isUndefined(url)) {
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
    if (!_.isUndefined(value)) {
        process.env.HB_SKIP_TESTS = value;
    }
};
Helper.isSkipTests = function () {
    return process.env.HB_SKIP_TESTS || false;
};

Helper.setSkipMinified = function (value) {
    if (!_.isUndefined(value)) {
        process.env.HB_SKIP_MINIFIED = value;
    }
};
Helper.isSkipMinified = function () {
    return process.env.HB_SKIP_MINIFIED || false;
};

Helper.setNoWarn = function (value) {
    if (!_.isUndefined(value)) {
        process.env.HB_NO_WARN = value;
    }
};
Helper.isNoWarn = function () {
    return process.env.HB_NO_WARN || false;
};

Helper.setIDE = function (value) {
    if (!_.isUndefined(value)) {
        process.env.HB_IDE = value;
    }
};
Helper.isIDE = function () {
    return process.env.HB_IDE || false;
};

Helper.setWebpackVisualizer = function (value) {
    if (!_.isUndefined(value)) {
        process.env.HB_WEBPACK_VISUALIZER = value;
    }
};
Helper.isWebpackVisualizer = function () {
    return process.env.HB_WEBPACK_VISUALIZER || false;
};

Helper.setModule = function (value) {
    if (!_.isUndefined(value)) {
        process.env.HB_MODULE = value;
    }
};

Helper.getModule = function () {
    return process.env.HB_MODULE;
};

Helper.setShowWebPackFiles = function (value) {
    if (!_.isUndefined(value)) {
        process.env.HB_SHOW_WEBPACK_FILES = value;
    }
};
Helper.isShowWebPackFiles = function () {
    return process.env.HB_SHOW_WEBPACK_FILES || false;
};
Helper.setDebugPort = function (port) {
    if (!_.isUndefined(port)) {
        process.env.HB_DEBUG_PORT = port;
    }
};
Helper.getDebugPort = function () {
    return parseInt(process.env.HB_DEBUG_PORT);
};

Helper.setLintRules = function (rules) {
    if (!_.isUndefined(rules)) {
        process.env.HB_LINT_RULES = rules;
    }
};

Helper.getLintRules = function () {
    return process.env.HB_LINT_RULES;
};

Helper.setLintReport = function (report) {
    if (!_.isUndefined(report)) {
        process.env.HB_LINT_REPORT = report;
    }
};

Helper.getLintReport = function () {
    return process.env.HB_LINT_REPORT || "prose";
};

Helper.setIgnoreAppDepVersion = function (ignore) {
    if (!_.isUndefined(ignore)) {
        process.env.IS_IGNORE_ENABLED = ignore;
    }
};

Helper.isIgnoreAppDepVersion = function () {
    return process.env.IS_IGNORE_ENABLED || false;
};

Helper.setMultiType = function (value) {
    if (!_.isUndefined(value)) {
        process.env.IS_MULTI_TYPE = value;
    }
};
Helper.isMultiType = function () {
    return process.env.IS_MULTI_TYPE || false;
};

Helper.setFile = function (value) {
    if (!_.isUndefined(value)) {
        process.env.HB_FILE = value;
    }
};
Helper.getFile = function () {
    return process.env.HB_FILE;
};

Helper.setDevMode = function (value) {
    if (!_.isUndefined(value)) {
        process.env.IS_DEV_MODE_ENABLED = value;
    }
};
Helper.isDevMode = function () {
    return process.env.IS_DEV_MODE_ENABLED || false;
};

Helper.setOfflineMode = function (value) {
    if (!_.isUndefined(value)) {
        process.env.IS_OFFLINE_MODE_ENABLED = value;
    }
};
Helper.isOfflineMode = function () {
    return process.env.IS_OFFLINE_MODE_ENABLED || false;
};

Helper.setRelease = function (value) {
    if (!_.isUndefined(value)) {
        process.env.RELEASE = value;
    }
};
Helper.getRelease = function () {
    return process.env.RELEASE;
};

Helper.setVersion = function (value) {
    if (!_.isUndefined(value)) {
        process.env.VERSION = value;
    }
};

Helper.getVersion = function () {
    return process.env.VERSION;
};

Helper.setDependency = function (value) {
    if (!_.isUndefined(value)) {
        process.env.DEPENDENCY = value;
    }
};

Helper.getDependency = function () {
    return process.env.DEPENDENCY;
};

Helper.setStopOnError = function (value) {
    if (!_.isUndefined(value)) {
        process.env.HB_STOP_ON_ERROR = value;
    }
}

Helper.getStopOnError = function () {
    return process.env.HB_STOP_ON_ERROR;
};

Helper.logBuilderModes = function () {
    Helper.debug("Mode DEBUG [ON]");
    Helper.debug("Mode IDE:", (Helper.isIDE() ? "[ON]" : "[OFF]"));
    Helper.debug("Mode FORCE:", (Helper.isForce() ? "[ON]" : "[OFF]"));
    Helper.debug("Mode Offline:", (Helper.isOfflineMode() ? "[ON]" : "[OFF]"));
    Helper.debug("Mode Dev:", (Helper.isDevMode() ? "[ON]" : "[OFF]"));
    Helper.debug("Mode Ignore app dep version:", (Helper.isIgnoreAppDepVersion() ? "[ON]" : "[OFF]"));
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
        gutil.log.call(gutil, argsWithColors);
    }
};

Helper.info = function () {
    gutil.log.apply(gutil, Helper.processLogArgs(arguments));
};

Helper.warn = function () {
    if(!Helper.isNoWarn()){
        var argsWithColors = chalk.black.bgYellow.apply(chalk, ["[WARN]"].concat(Helper.processLogArgs(arguments)));
        gutil.log.call(gutil, argsWithColors);
    }

};

Helper.error = function () {
    var argsWithColors = chalk.red.apply(chalk, ["[ERROR]"].concat(Helper.processLogArgs(arguments)));
    gutil.log.call(gutil, argsWithColors);
};

Helper.processLogArgs = function (args) {
    //Les objets ne sont pas stringifiés avec chalk donc c'est fait main :(
    var processedArgs = _.map(args, function (arg) {
        if (_.isObject(arg)) {
            if(arg instanceof Error) {
                return [os.EOL, arg.toString()];
            }
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
                var packageDef = require(packagePath);
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

Helper.getDependenciesHash = function (module) {
    var deps = {};
    var dependencies = module[Helper.APP_DEPENDENCIES] || module.dependencies || {};
    Object.keys(dependencies).forEach(function (name) {
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
Helper.getDependenciesReport = function (npm, root, keyDependencies, resolved, cb) {
    var report = {};
    var N = 0, j = 0;
    var seen = {};
    var timeExe = {};

    function getModuleReport(module, modulekeyDependencies) {
        var moduleReport = {
            name: module.name,
            version: module.version,
            deps: {}, // key => module dependency name, value => version (comme dependencies du package.json)
            deps2: {}, // key => module dependency name, value => objet<version, version string>
            hash: null,
            fixed: {}
        };
        var dependencies = module[modulekeyDependencies] || module.dependencies || {};
        Object.keys(dependencies).forEach(function (name) {
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

    /**
     * Fonction interrogeant le cache NPM pour trouver la dépendance, si non présente, on l'ajoute dans le cache.
     * @param {String} name nom de la dépendance
     * @param {String} version version de la dépendance
     * @param {Function} cb callback après la recherche
     */
    function readDependency(name, version, cb) {
        if (!version) version = '*';

        // si la dependance est dans les modules externes, on ne la recupere pas du cache NPM
        if (name in resolved && version == resolved[name].version && resolved[name].external) {
            j++;
            cb(resolved[name].packageJson);
        } else if (State.reportNpmSearchVersion[name + "@" + version]) {
            j++;
            cb(State.reportNpmSearchVersion[name + "@" + version]);
        } else {
            console.log = function () {
            };

            if (Helper.isOfflineMode()) {
                // TODO : n'est pas pris en compte pour le mode offline
                npm.config.set("fetch-retries", 0);
                //npm.config.set("fetch-retry-maxtimeout", 0);
                //npm.config.set("fetch-retry-mintimeout", 0);
                //npm.config.set("offline", true);
                console.log(npm.config.get("fetch-retries"));
            }

            npm.commands.cache(["list", name + "@" + version], function (err, files) {
                if (!err && files && files.length > 0) {
                    readCache(name, version, cb);
                } else {
                    if (!timeExe[name + "@" + version]) timeExe[name + "@" + version] = new Date().getTime();
                    npm.commands.cache.add(name, version, npm.config.root.cache, false, function (err, resolvedPackage) {
                        if (timeExe[name + "@" + version]) {
                            Helper.debug(name + "@" + version + " duration : ");
                            Helper.debug(new Date().getTime() - timeExe[name + "@" + version]);
                            delete timeExe[name + "@" + version];
                        }
                        j++;
                        if (!err && resolvedPackage) {
                            State.reportNpmSearchVersion[name + "@" + version] = resolvedPackage;
                            cb(resolvedPackage);
                        } else {
                            console.log = oldCLog;
                            Helper.error("Dépendance introuvable '" + name + "@" + version + "'");
                            if (name.startsWith("@")) {
                                cb(undefined);
                            } else {
                                if (!Helper.isOfflineMode()) {
                                    Helper.error("Problème de récupération de la dépendance '" + name + "@" + version + "'");
                                    throw err;
                                }
                            }
                        }
                    });
                }
            });
        }
    }

    /**
     * Fonction interrogeant le cache NPM pour trouver la dépendance, si non présente ou le fichier './package/package.json' non présent,
     *  l'ajoute depuis le repository mais sans créer le fichier './package/package.json'. Il faut passer par 'add' pour ca.
     * @param {String} name nom de la dépendance
     * @param {String} version version de la dépendance
     * @param {Function} cb callback après la recherche
     */
    function readCache(name, version, cb) {

        npm.commands.cache.read(name, version, false, function (err, resolvedPackage) {
            j++;
            if (!err && resolvedPackage) {
                State.reportNpmSearchVersion[name + "@" + version] = resolvedPackage;
                cb(resolvedPackage);
            } else {
                console.log = oldCLog;
                Helper.error("Dépendance introuvable '" + name + "@" + version + "'");
                if (name.startsWith("@")) {
                    cb(undefined);
                } else {
                    if (!Helper.isOfflineMode()) {
                        Helper.error("Problème de récupération de la dépendance '" + name + "@" + version + "'");
                        throw err;
                    }
                }
            }
        });
    }

    function mergeFixed(to, from) {
        var to2 = Object.create(to);
        Object.keys(from).forEach(function (fixed) {
            if (!(fixed in to2)) to2[fixed] = from[fixed];
        });
        return to2;
    }

    function walk(module, fixed, moduleKeyDependencies) {

        if (seen[module.name + "@" + module.version]) return;
        seen[module.name + "@" + module.version] = true;

        var moduleReport = getModuleReport(module, moduleKeyDependencies);

        if (!(module.name in report)) report[module.name] = {};
        report[module.name][module.version] = moduleReport;

        fixed = mergeFixed(fixed, moduleReport.fixed);

        Object.keys(moduleReport.fixed || {}).forEach(function (dep) {
            if(!State.reportFixed) {
                State.reportFixed={};
            }
            if(!State.reportFixed[root.name]) {
                State.reportFixed[root.name]={};
            }
            if(!State.reportFixed[root.name][dep]) {
                State.reportFixed[root.name][dep]={};
            }
            State.reportFixed[root.name][dep][moduleReport.fixed[dep]] = moduleReport.name;
        });

        Object.keys(moduleReport.deps || {}).forEach(function (dep) {
            N++;
            var version = fixed[dep] ? fixed[dep] : moduleReport.deps[dep];
            readDependency(dep, version, function (dependency) {
                if (dependency) {
                    moduleReport.deps2[dep] = {};
                    moduleReport.deps2[dep][dependency.version] = version;
                    walk(dependency, fixed, Helper.APP_DEPENDENCIES);
                }
            })
        });

        return moduleReport;
    }

    walk(root, getModuleReport(root, keyDependencies).fixed, keyDependencies);

    // attente de la fin des traitements asynchrones
    var t = setInterval(function () {
        if (j >= N) {
            clearInterval(t);
            console.log = oldCLog;
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
Helper.getFinalDependencies = function (report, root) {
    var dependencies = {};
    var merged = Helper.mergeReportDependencies(root, report);
    Helper.forEach2Depth(merged, function (name, version) {
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
Helper.mergeReportDependencies = function (root, report) {
    var merged = {};
    var mergedFixed = {};

    function add(name, version, versionQ, issuer) {
        if (!merged[name]) merged[name] = {};
        if (!merged[name][version]) merged[name][version] = {};
        merged[name][version][issuer] = versionQ;
    }

    function addFixed(name, version, versionQ, issuer) {
        if (!mergedFixed[name]) mergedFixed[name] = {};
        if (!mergedFixed[name][version]) mergedFixed[name][version] = {};
        mergedFixed[name][version][issuer] = versionQ;
    }
    function walk(module, mainModuleName) {
        Object.keys(report[module.name][module.version].deps2).forEach(function (moduleName) {
            if (mainModuleName && mainModuleName != moduleName) {
                Object.keys(report[module.name][module.version].deps2[moduleName]).forEach(function (moduleVersion) {
                    if (!merged[moduleName] || !merged[moduleName][moduleVersion] || !merged[moduleName][moduleVersion][module.name + '@' + module.version]) {
                        add(moduleName, moduleVersion, report[module.name][module.version].deps2[moduleName][moduleVersion], module.name + '@' + module.version);
                        walk({ name: moduleName, version: moduleVersion }, mainModuleName);
                    }
                    if(report[module.name][module.version].fixed) {
                        Object.keys(report[module.name][module.version].fixed).forEach(function (moduleName) {
                            let moduleVersion = report[module.name][module.version].fixed[moduleName];
                            if (!merged[moduleName] || !merged[moduleName][moduleVersion] || merged[moduleName][moduleVersion][module.name + '@' + module.version]) {
                                addFixed(moduleName, moduleVersion, report[module.name][module.version].fixed[moduleName][moduleVersion], module.name + '@' + module.version);
                            }
                        });
                    }
                });
            }
        });
    }

    walk(root, root.name);

    for(let modulename in mergedFixed) {
        if (!merged[modulename]) merged[modulename] = {};
        for(let version in mergedFixed[modulename]) {
            if (!merged[modulename][version]) merged[modulename][version] = {};
            for(let issuer in mergedFixed[modulename][version]) {
                if (!merged[modulename][version][issuer]) merged[modulename][version][issuer] = mergedFixed[modulename][version][issuer];
            }
        }

    }

    // on filtre les deps restantes pour ne garder que la plus grande version
    Helper.forEach1Depth(merged, function (name) {

        function arbo(name, version) {
            let report = [];
            let reportObj = {};
            reportObj[name+"@"+version] = {};
            if(merged[name]) {
                let currentReport = {};
                let previous = Object.keys(merged[name][version])[0].split('@');
                while(previous[0] != root.name && merged[previous[0]] && merged[previous[0]][previous[1]]) {
                    report.push(previous[0]+"@"+previous[1])
                    previous = Object.keys(merged[previous[0]][previous[1]])[0].split('@');
                }
            }

            report.forEach((elt, idx)=> {
                reportObj[elt] = {};
                reportObj[elt][Object.keys(reportObj)[0]] = reportObj[Object.keys(reportObj)[0]];
                delete reportObj[Object.keys(reportObj)[0]];
            });
            return reportObj;
        }


        var versions = Object.keys(merged[name]);
        if (versions.length > 1) {

            let lastVersionFixed = "";

            // si la version est spécifiée dans les dépendances du module principale
            // c'est cette version qu'on prend pour forcer le fix
            for (let version in merged[name]) {
                if (merged[name][version][root.name + "@" + root.version]) {
                    lastVersionFixed = version;
                    break;
                }
            }

            let lastVersion = Helper.getLastVersion(versions);

            if (lastVersionFixed) {
                if (lastVersionFixed != lastVersion) {
                    if (Helper.isIgnoreAppDepVersion()) {
                        Helper.info("Version App ignorée pour la dépendance '" + name + "' : " + lastVersionFixed + " / " + lastVersion + " (" + JSON.stringify(merged[name], null, 2) + ")");
                        lastVersion = lastVersionFixed;
                    } else {
                        Helper.info("Version fixée antérieure pour la dépendance '" + name + "' : " + lastVersionFixed + " / " + lastVersion + " (" + JSON.stringify(merged[name], null, 2) + ")");
                        lastVersion = lastVersionFixed;
                    }
                } else {
                    Helper.info("Version fixée par App pour la dépendance '" + name + "' : " + lastVersionFixed + " (" + JSON.stringify(merged[name], null, 2) + ")");
                }
            } else {
                Helper.debug("Sélection de la plus grande version pour la dépendance '" + name + "' : '" + lastVersion + "' (" + JSON.stringify(merged[name], null, 2) + ")");
            }

            if(State.reportFixed && State.reportFixed[root.name] && State.reportFixed[root.name][name] && (Object.keys(State.reportFixed[root.name][name]).length > 1 || !State.reportFixed[root.name][name][lastVersion])) {
                Helper.warn("Sélection de la plus grande version pour la dépendance '" + name + "' : '" + lastVersion + "' mais elle est fixée dans : " + JSON.stringify(State.reportFixed[root.name][name], null, 2));
                Helper.warn("Cette dépendance '" + name + "' : '" + lastVersion + "' est tirée par :" + JSON.stringify(arbo(name, lastVersion), null, "  |-" ).replace(/[\{\}\":]*/g, "").replace(/  /g, "").replace(/[\|\-\n\s]+\s*$/g, ""));
                
            }

            var save = merged[name][lastVersion];
            merged[name] = {};
            merged[name][lastVersion] = save;
        }
    });
    return merged;

};

Helper.forEach3Depth = function (obj, cb) {
    Object.keys(obj || {}).forEach(function (key1) {
        Object.keys(obj[key1] || {}).forEach(function (key2) {
            Object.keys(obj[key1][key2] || {}).forEach(function (key3) {
                cb(key1, key2, key3, obj[key1][key2][key3]);
            });
        });
    });
};
Helper.forEach2Depth = function (obj, cb) {
    Object.keys(obj || {}).forEach(function (key1) {
        Object.keys(obj[key1] || {}).forEach(function (key2) {
            cb(key1, key2, obj[key1][key2]);
        });
    });
};
Helper.forEach1Depth = function (obj, cb) {
    Object.keys(obj || {}).forEach(function (key1) {
        cb(key1, obj[key1]);
    });
};

Helper.cleanObj = function (obj) {
    Helper.forEach1Depth(obj, function (key) {
        if (Object.keys(obj[key]).length == 0) delete obj[key];
    });
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

/**
 * Installe une dépendance de test dans un répertoire spécifique avec instalallation des sous-dépendances
 * @param npm
 * @param dependencyName
 * @param dependencyVersion
 * @param tempDir
 * @param targetDir
 */
Helper.installTestDependency = function (npm, dependencyName, dependencyVersion, tempDir, targetDir) {

    return new Promise(function (resolve, reject) {
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
                    function () {
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

Helper.readInstalledDependencies = function (nodeModulesPath) {
    var installed = {};
    if (Helper.folderExists(nodeModulesPath)) {
        var files = fs.readdirSync(nodeModulesPath);
        Helper.each(files, function (file) {
            if (nodeModulesPath.indexOf("@") == -1 && file.indexOf("@") == -1) {
                var json = require(path.join(nodeModulesPath, file, "package.json"));
                installed[json.name] = json.version;
            }
        });
    }
    return installed;
};


Helper.getInstalledAppDependencies = function (rootPath, resolvedFromParent) {
    var installed = Helper.readInstalledDependencies(path.join(rootPath, Helper.NODE_MODULES_APP));
    Object.keys(resolvedFromParent).forEach(function (name) {
        installed[name] = resolvedFromParent[name].version;
    });
    return installed;
};


Helper.getInstalledTestDependencies = function (rootPath, resolvedFromParent) {
    var installed = Helper.readInstalledDependencies(path.join(rootPath, Helper.NODE_MODULES_TEST));
    // ajout des auto dépendances dans un projet parent
    Object.keys(resolvedFromParent).forEach(function (name) {
        installed[name] = resolvedFromParent[name].version;
    });
    return installed;
};

Helper.getInstalledTestBuildDependencies = function (rootPath, resolvedFromParent) {
    var installed = Helper.readInstalledDependencies(path.join(rootPath, resolvedFromParent));
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


Helper.getExternalModuleDirectories = function (project) {
    var moduleDirectories = [];
    try {
        var builder = project.builderJs;
        if (builder.externalModules && builder.externalModules.enabled &&
            builder.externalModules.directories &&
            builder.externalModules.directories.length > 0) {
            let current = process.cwd();
            let currentType = builder.type
            builder.externalModules.directories.forEach((directory) => {
                try {
                    directory = directory.replace("~", os.homedir());
                    if (fs.statSync(directory).isDirectory()) {
                        moduleDirectories.push(directory);
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
            Helper.getModuleList(project.dir, project).forEach(function (module) {
                moduleDirectories.push(module.dir);
            });
        } else {
            // si on traite un module dans un projet de type parent, on ajoute tous les modules de ce dernier
            let parentBuilderFile = path.join(project.dir, "../", Helper.BUILDER_FILE)
            if (fs.existsSync(parentBuilderFile)) {
                let parentBuilderJs = require(parentBuilderFile);
                if (parentBuilderJs.type === Helper.TYPE.PARENT) {
                    Helper.getModuleList(path.join(project.dir, "../"), project).forEach(function (module) {
                        moduleDirectories.push(module.dir);
                    });
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
            var packageJson = require(packageJsonPath);
            modules.push({
                dir: dir,
                name: packageJson.name,
                version: packageJson.version,
                packageJson: packageJson,
                external: true
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
    let configProjectPath = path.join(dir, "config", "default.json");
    let builderJsType;

    if (!fs.existsSync(packageJsonPath) || !fs.existsSync(builderJsPath)) {
        Helper.error("Le projet doit avoir un fichier package.json et un fichier builder.js (dir=" + process.cwd() + ")");
        process.exit(1);
    }

    builderJsType = Helper.ReadTypeBuilderJS(builderJsPath)
    let moduleResolver = require("./module-resolver");
    moduleResolver.addModuleDirectory(dir);
    moduleResolver.addModuleDirectory(path.normalize(path.join(dir, Helper.NODE_MODULES_BUILD)));

    let packageJson = require(packageJsonPath);
    let configProject = {};
    if (builderJsType === "application") {
        configProject = require(configProjectPath);
    }
    //retour arrière sur commit 187090, impossible à utiliser dans le cas ou le builder.js contient des requires
    //let builderJs = require(builderJsPath);

    moduleResolver.removeModuleDirectory(dir);
    moduleResolver.removeModuleDirectory(path.normalize(path.join(dir, Helper.NODE_MODULES_BUILD)));

    return {
        name: packageJson.name,
        version: packageJson.version,
        type: builderJsType,
        dir: dir,
        packageJson: packageJson,
        configJson: configProject,
        configJsonPath: configProjectPath,
        packageJsonPath: packageJsonPath,
        builderJs: builderJsPath
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


Helper.npmPublish = function (npm, rootPath, done) {
    Helper.info("npm publish : " + rootPath)
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

Helper.npmUnpublish = function (npm, name, version, done) {
    var oldRegistry = npm.config.get("registry");
    if (Helper.getPublishRegistry()) npm.config.set("registry", Helper.getPublishRegistry());
    npm.config.set("force", "true");
    npm.commands.unpublish([name + "@" + version], function (err) {
        npm.config.set("registry", oldRegistry);
        npm.config.set("force", "false");
        if (err) {
            Helper.error("Erreur 'unpublish' :", err);
        }
        done(err);
    });
};

Helper.checkTasksExistence = function (gulp, tasks) {
    tasks.forEach(function (task) {
        if (!gulp.hasTask(task)) {
            gutil.log(chalk.red("La tâche '" + task + "' n'existe pas"));
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

Helper.checkOrInstallBuildDependencies = function (project, npm, cb) {

    if (!Helper.checkBuildAndTestDependencies(project)) {
        process.exit(1);
    }

    if (Helper.detectBuildOrTestDependenciesChanges(project, Helper.BUILD_DEPENDENCIES, Helper.NODE_MODULES_BUILD)) {
        return Helper.installBuildOrTestDependencies(project, npm, Helper.BUILD_DEPENDENCIES, Helper.NODE_MODULES_BUILD, cb);
    } else {
        return Promise.resolve(true).then(() => {
            cb()
        });
    }
};

Helper.checkBuildAndTestDependencies = function (project) {
    var root = project.packageJson;
    var ok = true;

    // TODO, revoir le mode de fonctionnement de la fonction car pb avec builder.js qui possède un require
    //Helper.each(root[Helper.TEST_DEPENDENCIES], function(version, key) {
    //    if (!Helper.isValidVersion(version, key)) {
    //        ok = false;
    //        Helper.error("Version '" + version + "' interdite pour la dépendance de build/test '" + key + "' ==> vous devez utiliser une version figée");
    //    }
    //});
    return ok;
}

Helper.detectBuildOrTestDependenciesChanges = function (project, dependenciesKey, nodeModulePath) {
    var root = project.packageJson;
    var installedTestDependencies = Helper.getInstalledTestBuildDependencies(project.dir, nodeModulePath);
    var diff = false;
    if (!(dependenciesKey in root) || Object.keys(root[dependenciesKey]).length == 0) {

        Helper.debug("Aucune dépendances de build/test > rien à faire");
    } else {
        if (!Helper.folderExists(path.join(project.dir, Helper.NODE_MODULES)) || !Helper.folderExists(path.join(project.dir, nodeModulePath))) {

            Helper.info(chalk.green("Dépendances de build/test à installer avant la 1ère exécution du builder"));
            diff = true;
        } else if (Helper.isForce()) {

            Helper.debug("Dépendances de build/test à réinstaller en force");
            diff = true;
        } else {
            Helper.each(installedTestDependencies, function (version, name) {
                if (!(name in root[dependenciesKey])) {
                    diff = true;
                    Helper.info(chalk.green("Dépendances de build/test installée à supprimer : '" + name + "@" + version + "'"));

                } else if (root[dependenciesKey][name] != version) {
                    diff = true;
                    Helper.info(chalk.green("Dépendances de build/test installée dans une version différente : '" + name + "@" + version + "' > version attendue '" + root[dependenciesKey][name] + "'"));
                }
            });
            Helper.each(root[dependenciesKey], function (version, name) {
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

Helper.installBuildOrTestDependencies = function (project, npm, dependenciesKey, nodeModulePath, done) {
    var root = project.packageJson;
    var rootStr = root.name + '@' + root.version;
    var dependencies = root[dependenciesKey] || {};
    var toRemove = {}, toInstall = {}, toUpdate = {};

    // on analyse ce qu'il y a à supprimer / installer
    var installedDependencies = Helper.getInstalledTestBuildDependencies(project.dir, nodeModulePath);
    Helper.each(installedDependencies, function (version, name) {
        if (!(name in dependencies)) {
            toRemove[name] = version;
        } else if (version != dependencies[name]) {
            toUpdate[name] = version;
        }
    });
    Helper.each(dependencies, function (version, name) {
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
        if (!Helper.folderExists(nodeModulePath)) {
            fs.mkdirSync(nodeModulePath);
        }
    }

    // suppression des dépendances installées inutiles
    Helper.each(toRemove, function (version, name) {
        Helper.info("Suppression de la dépendance de build/test installée '" + name + "@" + version + "' car inutile");
        Helper.removeDir(path.join(project.dir, nodeModulePath, name));
    });

    var tempDir = path.join(Helper.findCacheFolder(), "__tmp");
    if (Helper.folderExists(tempDir)) {
        Helper.removeDir(tempDir);
        fs.mkdirSync(tempDir);
    }
    // suppression des dépendances à mettre à jour
    Helper.each(toUpdate, function (version, name) {
        var modulePath = path.join(project.dir, nodeModulePath, name);
        Helper.info("Suppression de la dépendance de build/test installée '" + name + "@" + version + "' car à mettre à jour en version '" + dependencies[name] + "'");
        Helper.removeDir(modulePath);
        Helper.installTestDependency(npm, name, dependencies[name], tempDir, path.join(nodeModulePath, name))
    });

    var myPromise = Promise.resolve();
    var idx = 0, nDeps = Object.keys(toInstall).length;
    // installation des nouvelles dépendances de test
    Helper.each(toInstall, function (version, name) {
        myPromise = myPromise.then(function (resolve, reject) {
            Helper.info("Installation de la dépendance de build/test " + (++idx) + "/" + nDeps + " : '" + name + "@" + version + "'");
            return Helper.installTestDependency(npm, name, dependencies[name], tempDir, path.join(nodeModulePath, name));
        });
    });
    myPromise.catch(function (err) {
        Helper.error("Erreur durant l'installation des dépendances de build/test : " + err);
        process.exit(1);
    });
    return myPromise.then(function (resolve) {
        done();
    });
}

Helper.excludeNodeModulesFromWebpack = function (modulesName, webpackConfiguration) {
    var regexps = [];
    modulesName.forEach(function (moduleName) {
        regexps.push(new RegExp(path.normalize(path.join(Helper.NODE_MODULES_APP, moduleName, ".*$")).replace(/\\/g, "\\\\")));
    });

    if (!webpackConfiguration.module) {
        webpackConfiguration.module = {};
    }

    if (!webpackConfiguration.module.noParse || !_.isArray(webpackConfiguration.module.noParse)) {
        webpackConfiguration.module.noParse = [];
    }

    regexps.forEach(function (regexp) {
        webpackConfiguration.module.noParse.push(regexp);
    })
};

Helper.excludeLocalFilesFromWebpack = function (fileNames, webpackConfiguration) {
    var regexps = [];
    fileNames.forEach(function (fileName) {
        regexps.push(new RegExp(path.normalize(path.join(fileName, ".*$")).replace(/\\/g, "\\\\")));
    });

    if (!webpackConfiguration.module) {
        webpackConfiguration.module = {};
    }

    if (!webpackConfiguration.module.noParse || !_.isArray(webpackConfiguration.module.noParse)) {
        webpackConfiguration.module.noParse = [];
    }

    regexps.forEach(function (regexp) {
        webpackConfiguration.module.noParse.push(regexp);
    })
};

module.exports = Helper;