"use strict";
//Début Hack NodeJS 0.12.2
//Ce require sert uniquement à faire fonctionner les TU sur NodeJS 0.12.2, à enlever quand bug de NodeJs corrigé.
//Sans doute un bug de constructeur asynchrone mais impossible de trouver la cause réelle
require("newforms");
//Fin Hack NodeJS 0.12.2

var path = require("path");
var del = require("del");
var _ = require("lodash");
var concat = require("gulp-concat");
var nodemon = require("gulp-nodemon");
var zip = require("gulp-zip");
var gulpTypescript = require("gulp-typescript");
var sourcemaps = require("gulp-sourcemaps");
var gulpWebpack = require("gulp-webpack");
var gulpTsLint = require("gulp-tslint");
var webpack = require("webpack");
var through = require("through2");
var mocha = require("gulp-mocha");
var react = require("gulp-react");
var istanbul = require("gulp-istanbul");
var gutil = require("gulp-util");
var os = require("os");
var npm = require("npm");
var gulpEol = require("gulp-eol");

module.exports = {
    gulpTasks: function (gulp, project, conf, helper) {

        var testWorkDir = "istanbul";
        var defaultConf = {
            src: "src",
            test: "test",
            static: "static",
            js: "js",
            config: "./config",
            generatedTypings: {
                dir: ".",
                file: "definition.d.ts"
            },
            clientJs: "client.js",
            testWorkDir: testWorkDir,
            mocha: {
                reporter: process.env.NODE_ENV === "integration" ? "xunit" : "spec",
                reporterOptions: {
                    output: "test-results.xml"
                }
                //,"grep": "Router constructor"
            },
            istanbul: {
                dir: path.join(testWorkDir, "coverage"),
                reporters: ["lcov", "text", "text-summary", "cobertura"],
                reportOpts: {dir: path.join(testWorkDir, "reports")}
            },
            istanbulOpt: {
                includeUntested: true
            },
            webPackConfiguration: null,
            webPackMinChunks: 3,
            webPackLogAddedFiles: true
        };

        // Extension de la conf
        _.merge(conf, defaultConf);
        buildConf();

        // initialisation de la conf webpack
        conf.webPackConfiguration = require("../webpack/default-webpack-config.js").browser(project, conf, helper.isDebug());

        //
        // Gestion du clean des target
        //
        function cleanTaskFn(cb) {
            gulpDelete(conf.cleanElements)(cb);
        }

        function cleanTestTaskFn(cb) {
            gulpDelete(conf.cleanTestElements)(cb);
        }

        /**
         * Fonction générique de recopie de fichiers vers le repertoire de destination
         * @param sources
         * @param base
         * @param target
         * @returns {Function}
         */
        function prepareFiles(sources, base, target, done) {
            helper.stream(
                done,
                gulp.src(sources, {
                    base: base
                }).pipe(gulp.dest(target))
            );
        }

        function preparePackageSpa(done) {
            prepareFiles(conf.complementarySpaSources, undefined, conf.static, done);
        }

        function prepareTestSources(done) {

            // on copie toutes les sources js vers le répertoire istanbul
            // on transpile tous les jsx en js
            // les require sont remplacés pour revenir en url relative pour la couverture de code
            // puis on supprime tous les jsx pour éviter de lancer 2 fois les mêmes tests
            helper.stream(
                function () {
                    gulpDelete(path.join(conf.testWorkDir, "**/*.jsx"))(done)
                },

                gulp.src(conf.allSources, {base: '.' + path.sep})
                    .pipe(relativizeModuleRequire())
                    .pipe(gulp.dest(conf.testWorkDir)),

                gulp.src(["**/*.jsx"])
                    .pipe(react({harmony: true}))
                    .pipe(relativizeModuleRequire())
                    .pipe(gulp.dest(conf.testWorkDir))
            );

        }

        //
        // Tests
        //
        function instrumentSources(done) {
            helper.stream(
                done,
                gulp.src(conf.instrumentableSources, {
                        read: true,
                        base: conf.instrumentableSourcesBase
                    })
                    .pipe(gulp.dest(conf.testWorkDir))
                    // instrumentation du code
                    .pipe(istanbul(conf.istanbulOpt))
                    .pipe(istanbul.hookRequire()) // Force `require` to return covered files
            );
        }

        function runTests(done) {

            // On ajoute le répertoire de dépendances de build/test du projet courant et on le supprimera une fois les tests terminés
            var moduleResolver = require("../module-resolver");
            var savedCurrentModulePaths = moduleResolver.getModuleDirectories();
            helper.applyExternalModuleDirectories(moduleResolver, project);
            moduleResolver.addModuleDirectory(path.join(project.dir, helper.NODE_MODULES_TEST));

            // Transpileur jsx -> js pour les jsx dans les dépendances
            require("node-jsx").install({
                extension: ".jsx",
                harmony: true
            });

            helper.stream(
                function () {
                    // revert modules paths
                    moduleResolver.setModuleDirectories(savedCurrentModulePaths);

                    // au cas où un test défini la variable document permet d'éviter que le chargement de 'sinon' échoue
                    delete global.document;
                    done();
                },
                gulp.src(conf.testSources, {
                        read: true,
                        base: conf.testSourcesBase
                    })
                    .pipe(gulp.dest(conf.testSourcesBase))
                    // Exécution des tests
                    .pipe(mocha(conf.mocha))
                    // Ecriture des rapports de couverture de code
                    .pipe(istanbul.writeReports(conf.istanbul))
            );
        }


        function buildTypeScript(doneFn) {
            if (helper.isIDE()) {
                // Ide: rien à compiler c'est l'IDE qui gère les .js, les .dts et les .maps
                helper.debug("Pas besoin de compiler les TS ni les DTS");
                doneFn();
                return;
            }
            if (!helper.fileExists(path.join(project.dir, "tsconfig.json"))) {
                return doneFn(new Error("Le fichier 'tsconfig.json' est introuvable dans le répertoire '" + project.dir + "'"));
            }
            var tsProject = gulpTypescript.createProject(path.join(project.dir, "tsconfig.json"), {
                declaration: true,
                typescript: require("typescript") // permet de forcer la version de typescript déclarée dans le builder plutôt que celle du plugin gulp-typescript
            });

            // Activation de la génération des sources maps
            var tsResult = gulp.src(["**/*.ts", "**/*.tsx", "!node_modules/**/*", "definition-ts/**/*.d.ts"])
                .pipe(sourcemaps.init());

            // Activation de la compilation typeScript
            tsResult = tsResult.pipe(gulpTypescript(tsProject));

            // Gestion des erreurs
            var hasError = false;
            tsResult.on("error", function () {
                hasError = true;
            });

            var jsPipe = tsResult.js
                // modifie les fichiers pour que le plugin sourcemaps génère correctement les fichiers de map
                .pipe(rebase(conf.targetTS))
                .pipe(sourcemaps.write(".", {
                    includeContent: false, sourceRoot: function () {
                        return "";
                    }
                })) //
                // restaure le paramétrage des fichiers après la génration des fichiers de map
                .pipe(rebase(conf.targetTS))
                .pipe(gulp.dest(conf.targetTS));

            var dtsPipe = tsResult;
            if (project.type !== "application") {
                // Pour les applications les fichiers de définitions ne sont pas utiles
                dtsPipe = tsResult.dts.pipe(gulp.dest(conf.targetTS));
            }

            // Merge des deux pipes pour terminer quand les deux sont terminés
            helper.stream(
                function () {
                    doneFn(hasError ? new gutil.PluginError("gulp-typescript", "Au moins une erreur de compilation typeScript s'est produite") : undefined);
                },
                dtsPipe,
                jsPipe
            );
        }

        /**
         * Altère la description des fichiers pour la bonne génération des sourcemaps
         * @param defaultBase file.base à appliquer sur les fichier de map
         * @return {*}
         */
        function rebase(defaultMapBase) {
            return through.obj(function (file, enc, cb) {
                if (file.isNull()) {
                    cb(null, file);
                    return;
                }

                if (file.isStream()) {
                    cb(new gutil.PluginError("hornetbuilder-rebase", "Streaming not supported"));
                    return;
                }

                try {
                    // nouvelles valeurs de 'file.base' et 'file.relative' à appliquer
                    var newbase = file.oldBase || path.join(file.base, path.dirname(file.relative));
                    //var newrelative = file.oldRelative || path.basename(file.relative);

                    var isMap = _.endsWith(file.relative, ".js.map");
                    var firstPass = !(file.oldBase); // premier passage
                    if (isMap) {
                        newbase = defaultMapBase;
                    } else if (firstPass && file.sourceMap && file.sourceMap.sources) {
                        // ne conserve dans l'attribut 'file.sourceMap.sources' que les noms des fichier,
                        // à la place du chemin relatif
                        var newSources = file.sourceMap.sources.map(function (sourceMapFile) {
                            return sourceMapFile.split("/").pop(); // extraction du nom de fichier
                        });
                        file.sourceMap.sources = newSources;
                    }

                    // permet de se rappeler des valeurs actuelles pour le prochain passage
                    file.oldBase = file.base;
                    file.oldRelative = file.relative;

                    file.base = newbase;
                    //file.relative = newrelative;
                    this.push(file);
                } catch (err) {
                    this.emit("error", new gutil.PluginError("hornetbuilder-rebase", err, {
                        fileName: file.path
                    }));
                }

                cb();
            });
        }

        function buildTypeScriptDefinition(cb) {
            var moduleName = project.packageJson.name;
            var dest = path.join(conf.generatedTypings.dir);
            helper.debug("[buildTypeScriptDefinition] dest:", dest);

            helper.stream(
                function () {
                    gulpDelete(conf.postTSClean)(cb);
                },
                gulp.src(conf.sourcesDTS)
                    .pipe(modularizeDTS())
                    .pipe(concat(conf.generatedTypings.file))
                    .pipe(absolutizeModuleRequire())
                    //.pipe(postProcessDTS())
                    .pipe(gulp.dest(dest))
            );
        }

        /**
         * Concatène les fichiers de définition TS. Chaque définition issue d'un fichier est encapsulée dans un module :
         * <pre>
         * declare module "..." {
         *     // contenu du fichier de défintion TS
         * }
         * </pre>
         */
        function modularizeDTS() {
            // require("./aaa")
            // require("../aaa")
            // require("../../aaa")
            // require("../../aaa/bbb")
            // require("src/aaa/bbb")
            var regexRequire = /require\(["'](([\.\/]+|src\/)[\w\-\/]*)["']\)/;

            return through.obj(function (file, enc, cb) {
                if (file.isNull()) {
                    cb(null, file);
                    return;
                }

                if (file.isStream()) {
                    cb(new gutil.PluginError("modularizeDTS", "Streaming not supported"));
                    return;
                }

                try {
                    /*
                     * Détermine le nom du module (ambient) TS à partir du chemin du fichier :
                     * C:/.../hornet/hornet-js/projet/src/.../fichierModule.d.ts
                     * ->
                     * projectName/src/.../fichierModule
                     */
                    var absolutePath = file.path,
                        dir = path.dirname(absolutePath),
                        fileName = path.basename(absolutePath, ".d.ts"),
                        substrFrom = conf.baseDir.length,
                        substrTo = absolutePath.indexOf(".d.ts"),
                        moduleName = path.join(project.name, absolutePath.substring(substrFrom, substrTo)),
                        content = file.contents.toString().replace(/declare /g, "").replace(/\r\n/g, "\n"),
                        lines = content.split("\n"),
                        moduleContent = "declare module ";

                    helper.debug("[modularizeDTS] absolutePath: ", absolutePath);
                    helper.debug("[modularizeDTS] moduleName: ", moduleName);

                    moduleName = systemPathToRequireName(moduleName);

                    // le fichier index fourni le module "de base"
                    if (fileName === "index") {
                        moduleName = moduleName.substr(0, moduleName.indexOf("/"));
                    }

                    // remplacement des require("<cheminRelatif>") par require("<moduleName>/src/ts/<cheminRelatif>")
                    lines = _.map(lines, function (line) {
                        var processedLine = line,
                            matches = regexRequire.exec(line);
                        //helper.debug("line: ", line, "match:", matches);
                        if (matches) {
                            var required = matches[1];
                            if (helper.startsWith(required, "src/")) {
                                if (helper.fileExists(path.join(project.dir, required + ".js"))
                                    || helper.fileExists(path.join(project.dir, required + ".jsx"))) {
                                    required = project.name + "/" + required;
                                    // mise à jour du require()
                                    processedLine = line.replace(regexRequire, "require(\"" + required + "\")");
                                }
                            } else {
                                // récupération du fichier correspondant : "/.../hornet-js/projet_a/x/y/z/..."
                                required = path.resolve(dir, required);
                                helper.debug("[modularizeDTS] raw required:", required);
                                // extraction du chemin interne d'accès, relatif à la racine du projet courant :
                                // "/x/y/z/..."
                                var innerRequiredPath = required.substr(substrFrom);
                                // ajout du nom externe du projet (déclaré dans package.json)
                                required = path.join(project.name, innerRequiredPath);
                                // '\' -> '/' (Windows)
                                required = systemPathToRequireName(required);
                                // mise à jour du require()
                                processedLine = line.replace(regexRequire, "require(\"" + required + "\")");
                            }
                        }
                        return processedLine;
                    });


                    lines = _.map(lines, function (line) {
                        return '\t' + line;
                    });

                    moduleContent += "\"" + moduleName + "\" {" + "\n";
                    moduleContent += lines.join("\n");
                    moduleContent += "\n" + "}" + "\n";
                    file.contents = new Buffer(moduleContent);
                    this.push(file);
                } catch (err) {
                    this.emit("error", new gutil.PluginError("modularizeDTS", err, {
                        fileName: file.path
                    }));
                }

                cb();
            });
        }

        function systemPathToRequireName(systemPath) {
            return systemPath.replace(/\\/g, "/");
        }

        /**
         * Nettoie le fichier defintion.d.ts global du module
         */
        function postProcessDTS() {
            var regexTypings = /path="(.+\/hornet-js-ts-typings\/)/,
                regexReferences = /([\/]{3}\s+<reference\s+path="[^"]*"\s*\/>)/;

            return through.obj(function (file, enc, cb) {
                helper.debug("[postProcessDTS] file.path: " + file.path);

                try {
                    var content = file.contents.toString(),
                        lines = content.split("\n");

                    // extraction des "/// <reference path="..." />"
                    var references = _.filter(lines, function (line) {
                        return regexReferences.test(line);
                    });
                    lines = _.filter(lines, function (line) {
                        return !regexReferences.test(line);
                    });

                    // (../)*hornet-js-ts-typings/aaa/ -> ../aaa
                    references = _.map(references, function (reference) {
                        return reference.replace(regexTypings, "path=\"../");
                    });

                    // dé-duplication des "/// <reference path="..." />"
                    references = _.uniq(references);
                    references = references.join(os.EOL);

                    var newContent = lines.join(os.EOL);
                    newContent = references + os.EOL + newContent;

                    file.contents = new Buffer(newContent);
                    this.push(file);
                } catch (err) {
                    this.emit("error", new gutil.PluginError("postProcessDTS", err, {
                        fileName: file.path
                    }));
                }

                cb();
            });
        }

        function watchTypeScript() {
            //Pourquoi 2 fonctions: car quand gulp voit une fonction avec un parametre 'cb' il ne lit plus le retour du gulp.watch
            if (helper.isIDE()) {
                return function (cb) {
                    helper.debug("Ignore watchTypeScript");
                    cb();
                };
            } else {
                return function (done) {
                    helper.debug("Activation de watchTypeScript");
                    gulp.watch(conf.sourcesTS, ["compile-no-clean:ts"]);
                    done();
                };
            }
        }

        function watchDTypeScript() {
            var watchConf = conf.sourcesTS;
            if (helper.isIDE()) {
                // On prend directement les DTS
                watchConf = conf.sourcesDTS;
            }

            var watchOptions = {
                debounceDelay: 200
            };
            var watcher = gulp.watch(watchConf, watchOptions, ["compile-no-clean:dts"]);
            watcher.on("change", function (event) {
                helper.debug("Fichier ", event.path, "a été", event.type);
            });
            return watcher;
        }

        //
        // Gestion de la construction des fichiers bundles client
        //
        function buildClientTaskFn(debugMode, watchMode, done) {
            // Configuration dynamique de webpack
            if (!debugMode) {
                process.env.NODE_ENV = "production";
            } else {
                conf.webPackConfiguration.debug = true;
            }

            conf.webPackConfiguration.watch = watchMode === true;

            if (!debugMode && !helper.isSkipMinified()) {
                conf.webPackConfiguration.plugins.push(conf.webPackConfiguration.minifiedPlugin);
            }

            if (conf.webPackConfiguration.resolve.modulesDirectories && _.isArray(conf.webPackConfiguration.resolve.modulesDirectories)) {
                conf.webPackConfiguration.resolve.modulesDirectories.forEach(function (dir) {
                    helper.warn("WEBPACK MODULE RESOLVER > répertoire déclaré :", dir);
                });
            }

            if (conf.webPackConfiguration.module.noParse && _.isArray(conf.webPackConfiguration.module.noParse)) {
                conf.webPackConfiguration.module.noParse.forEach(function (regexp) {
                    helper.warn("WEBPACK MODULE RESOLVER > exclusions de :", regexp.toString());
                });
            }

            // Lancement de webpack
            helper.stream(
                function () {
                    if (!watchMode) done();
                },
                gulp.src(conf.targetClientJs)//
                    .pipe(gulpWebpack(conf.webPackConfiguration, webpack, function(err, stats) {
                        gutil.log(stats.toString(conf.webPackConfiguration.stats));
                    }))//
                    .pipe(gulpEol("\n"))
                    .pipe(gulp.dest(path.join(conf.static, conf.js)))
            );
            if (watchMode) done();
        }

        //
        // Gestion de la construction et de l'écoute des fichiers clients
        //
        function watchClientTaskFn(done) {
            return buildClientTaskFn(true, true, done);
        }

        function watchClientProdTaskFn(done) {
            return buildClientTaskFn(false, true, done);
        }

        //
        // Gestion du packaging des fichiers bundles client
        //
        function buildMinifiedBundleTaskFn(done) {
            return buildClientTaskFn(false, false, done);
        }

        //
        // Gestion de la construction oneShot des clients
        //
        function buildOneShotBundleTaskFn(done) {
            return buildClientTaskFn(true, false, done);
        }

        //
        // Gestion du tslint (qualité de code)
        //
        function lintTaskFn(done) {
            var lintRulesPath = "../conf/tslint.json";
            if(helper.getLintRules()){
                if(path.isAbsolute(helper.getLintRules())){
                    lintRulesPath = helper.getLintRules();
                }else{
                    lintRulesPath = path.normalize(path.join(project.dir, helper.getLintRules()));
                }
            }

            helper.stream(
                done,
                gulp.src(conf.sourcesTS)
                    .pipe(gulpTsLint(
                        {
                            rulesDirectory: path.join(__dirname, "../../node_modules/tslint-microsoft-contrib"),
                            configuration: require(lintRulesPath)
                        })
                    )
                    .pipe(gulpTsLint.report(helper.getLintReport(), {
                        emitError: false
                    }))
            );
        }

        //
        // Gestion du rechargement serveur
        //
        function watchServerTaskFn(breakOnStart, env) {
            var args = [];
            var debugPort = helper.getDebugPort();
            if (_.isNumber(debugPort) && !_.isNaN(debugPort)) {
                if (breakOnStart) {
                    args.push("--debug-brk=" + debugPort);
                } else {
                    args.push("--debug=" + debugPort);
                }
            }
            return function (done) {
                nodemon({
                    watch: [conf.src, conf.config].concat(helper.getExternalModuleDirectories()),
                    script: project.packageJson.main,
                    ext: "html js jsx tsx json css",
                    ignore: [conf.targetClientJs],
                    nodeArgs: args,
                    delay: 3,
                    env: {"NODE_ENV": env},
                    execMap: {
                        js: "node"
                    }
                });
                done();
            };
        }

        //
        // Gestion du packaging en .zip
        //
        function zipTaskFn(isStatic) {
            return function (cb) {
                var staticPath = path.join("./" + conf.static + "/**/*");
                var fileList = [];
                var fileListMap = [];
                var fileListSources = [];
                var zipnameinit = project.name + "-" + project.version;
                var zipname = "";
                if (isStatic) {
                    fileList.push(staticPath);
                    zipname = zipnameinit + "-static";
                } else {
                    fileList.push(path.join("./index.*"));
                    fileList.push(path.join(conf.src, "/**/*"));
                    fileList.push(staticPath);
                    fileList.push(path.join("./", helper.NODE_MODULES_APP + "/**/*"));
                    fileList.push(path.join(conf.config + "/**/*"));
                    fileList.push(path.join("./package.json"));
                    zipname = zipnameinit + "-dynamic";
                }

                fileList.push("!**/*.map");
                if (isStatic) {
                    var staticMapPath = path.join("./" + conf.static + "/js/*.map");

                    fileListMap.push(staticMapPath);

                    gulp.src(fileListMap, {base: "./" + conf.static + "/js"})
                        .pipe(zip(zipname + "-map.zip"))
                        .pipe(gulp.dest("./target/"));
                } else {
                    // map de la partie dynamique
                    fileListMap = fileList.slice(0);
                    fileListMap.push("**/*.map");
                    fileListMap.push("!./" + conf.static);

                    //gulp.src(fileListMap, {base: "."})
                    //    .pipe(zip(zipname + "-map.zip"))
                    //    .pipe(gulp.dest("./target/"));

                    //sources du projet
                    fileListSources = fileList.slice(0);
                    fileListSources.push("./*.*");
                    fileListSources.push("!" + conf.src + "/**/*.js");
                    fileListSources.push("!**/*.map");
                    fileListSources.push("!./index.js");

                    gulp.src(fileListSources, {base: "."})
                        .pipe(zip(zipnameinit + "-sources.zip"))
                        .pipe(gulp.dest("./target/"));


                }

                fileList.push("!**/*.ts");

                helper.debug("Zip fileList:", fileList);

                // once preprocess ended, concat result into a real file
                return helper.stream(
                    cb,
                    gulp.src(fileList, {base: "."})
                        .pipe(zip(zipname + ".zip"))
                        .pipe(gulp.dest("./target/"))
                );
            }
        }

        function modulePublishTaskFn(done) {
            var vfs = require("vinyl-fs");
            helper.stream(
                function () {
                    helper.npmPublish(npm, "./tmpPublish", function (err) {
                        helper.removeDir("./tmpPublish");
                        done(err);
                    });
                },
                // vfs au lieu de gulp car bug sur les liens symboliques avec gulp >= 3.8.0
                vfs.src(["**/*", "definition-ts/**/*", "!node_modules/**/*", "!istanbul/**/*"])
                    .pipe(absolutizeModuleRequire())
                    .pipe(gulp.dest("./tmpPublish"))
            );

        }

        function absolutizeModuleRequire() {
            // require('src/aaa/bbb') > require('hornet-js-core/src/aaa/bbb')
            var regexRequire = /require\(["'](src\/[\w\-\/]*)["']\)/;
            var regexImportExportFrom = /(import|export)[\s]*(.*)[\s]*from[\s]*["'](src\/[\w\-\/]*)["']/;

            return through.obj(function (file, enc, cb) {
                if (file.isNull()) {
                    cb(null, file);
                    return;
                }

                if (file.isStream()) {
                    cb(new gutil.PluginError("absolutizeModuleRequire", "Streaming not supported"));
                    return;
                }

                try {
                    var content = file.contents.toString()/*.replace(/declare /g, '')*/.replace(/\r\n/g, "\n"),
                        lines = content.split("\n");

                    // remplacement des require("src/...") par require("<moduleName>/src/...") OU
                    // remplacement des import ... from "src/..." par import ... from "<moduleName>/src/..." OU
                    // remplacement des export from "src/..." par export from "<moduleName>/src/..." OU
                    lines = _.map(lines, function (line) {
                        var processedLine = line,
                            matches = regexRequire.exec(line),
                            matches2 = regexImportExportFrom.exec(line);

                        if (matches) {
                            var required = matches[1];
                            if (helper.fileExists(path.join(project.dir, required + ".js")) || helper.fileExists(path.join(project.dir, required + ".jsx"))) {
                                required = project.name + "/" + required;
                                processedLine = line.replace(regexRequire, "require(\"" + required + "\")");
                            }
                        } else if (matches2) {
                            var requiredType = matches2[1],
                                required = matches2[2],
                                requiredSrc = matches2[3];
                            if (helper.fileExists(path.join(project.dir, requiredSrc + ".js")) || helper.fileExists(path.join(project.dir, requiredSrc + ".jsx"))) {
                                requiredSrc = project.name + "/" + requiredSrc;
                                processedLine = line.replace(regexImportExportFrom, requiredType + " " + required + " from \"" + requiredSrc + "\"");
                            }

                        }
                        return processedLine;
                    });

                    file.contents = new Buffer(lines.join("\n"));
                    this.push(file);
                } catch (err) {
                    this.emit("error", new gutil.PluginError("absolutizeModuleRequire", err, {
                        fileName: file.path
                    }));
                }

                cb();
            });
        }

        function relativizeModuleRequire() {
            // require('src/aaa/bbb') > require('../aaa/bbb')
            var regexRequire = /(require|proxyquire)\(["']((src|test)\/[^"']*)["']/;

            return through.obj(function (file, enc, cb) {
                if (file.isNull()) {
                    cb(null, file);
                    return;
                }

                if (file.isStream()) {
                    cb(new gutil.PluginError("relativizeModuleRequire", "Streaming not supported"));
                    return;
                }

                try {
                    var content = file.contents.toString().replace(/declare /g, "").replace(/\r\n/g, "\n"),
                        lines = content.split("\n");

                    // remplacement des require("src/...") par require("../...")
                    lines = _.map(lines, function (line) {
                        var processedLine = line,
                            matches = regexRequire.exec(line);

                        if (matches) {
                            var required = matches[2];
                            var fileDir = path.dirname(file.path);
                            //console.log("file.path=",file.path, " required=", required, " fileDir=", fileDir);
                            var isJs = false;
                            if (isJs = helper.fileExists(path.join(project.dir, required + ".js")) || helper.fileExists(path.join(project.dir, required + ".jsx"))) {
                                var sr = required;
                                required = "./" + path.relative(fileDir, path.join(project.dir, required + (isJs ? ".js" : ".jsx"))).replace(/\.[^.$]+$/, "").replace(/\\/g, "/");
                                //console.log("file = " , fileDir, ", require1 = ", sr, ", require2 = ", required)
                                processedLine = line.replace(regexRequire, (line.indexOf("proxyquire") == -1 ? "require" : "proxyquire") + "(\"" + required + "\"");
                            }
                        }
                        return processedLine;
                    });

                    file.contents = new Buffer(lines.join("\n"));
                    this.push(file);
                } catch (err) {
                    this.emit("error", new gutil.PluginError("relativizeModuleRequire", err, {
                        fileName: file.path
                    }));
                }

                cb();
            });
        }

        //
        // Les micros étapes Gulp
        //

        gulp.task("clean:test", cleanTestTaskFn);
        gulp.task("clean", ["clean:test"], cleanTaskFn);

        gulp.task("compile:ts", ["clean", "dependencies:install-ts-definition"], buildTypeScript);
        gulp.task("compile-no-clean:ts", ["dependencies:install-ts-definition"], buildTypeScript);

        if (project.type === "application") {
            gulp.task("compile", ["compile:ts"]);

        } else {
            gulp.task("compile:dts", ["compile:ts"], buildTypeScriptDefinition);
            gulp.task("compile-no-clean:dts", ["compile-no-clean:ts"], buildTypeScriptDefinition);

            gulp.task("compile", ["compile:dts"]);
        }

        if (project.type === "module") {
            gulp.task("publish", ["compile", "dependencies:fix-app"], modulePublishTaskFn);
        } else {
            gulp.addTaskDependency("publish", "compile");
            gulp.addTaskDependency("publish", "dependencies:fix-app");
        }

        // Exécution des tests
        gulp.task("prepare:testSources", ["compile"], prepareTestSources);
        gulp.task("test:instrument", ["prepare:testSources"], instrumentSources);
        gulp.task("test", ["dependencies:install", "test:instrument"], runTests);

        //Packaging
        if (project.type === "application") {
            gulp.task("prepare-package:minified", [/*"compile"*/], buildMinifiedBundleTaskFn);
            gulp.task("prepare-package:spa", [/*"compile"*/], preparePackageSpa);
            gulp.task("prepare-package", [/*"compile"*/], buildOneShotBundleTaskFn);

            gulp.task("package-zip-static", ["prepare-package:minified"], zipTaskFn(true));
            gulp.task("package-zip-dynamic", ["prepare-package:minified"], zipTaskFn(false));
            gulp.task("package", ["test", "package-zip-static", "package-zip-dynamic"]);
        } else {
            gulp.task("package", ["test"]);
        }

        if (helper.isSkipTests()) {
            gulp.task("test", [], function (done) {
                helper.info("Exécution des tests annulée car l'option '--skipTests' a été utilisée");
                done();
            });
        }

        // Par défaut, on package.
        gulp.task("default", ["package"]);

        //
        // Les étapes Gulp spéciales DEV
        //
        gulp.task("watch:ts", [], watchTypeScript());

        gulp.task("lint", ["compile"], lintTaskFn);

        if (project.type === "application") {
            gulp.task("watch:serveur", ["watch:ts"], watchServerTaskFn(false, "development"));
            gulp.task("watch:serveur-brk", ["watch:ts"], watchServerTaskFn(true, "development"));
            gulp.task("watch:serveur-prod", ["watch:ts"], watchServerTaskFn(false, "production"));
            gulp.task("watch:client", ["watch:ts"], watchClientTaskFn);
            gulp.task("watch:client-prod", ["watch:ts"], watchClientProdTaskFn);

            gulp.task("watch", ["dependencies:install", "compile", "watch:client", "watch:serveur"]);
            gulp.task("watch-prod", ["dependencies:install", "compile", "watch:client-prod", "watch:serveur-prod"]);

            // raccourcis
            gulp.task("ws", ["watch:serveur"]);
            gulp.task("wsd", ["watch:serveur-brk"]);
            gulp.task("wc", ["watch:client"]);
            gulp.task("wp", ["watch-prod"]);
        } else {
            gulp.task("watch:dts", ["compile:dts"], watchDTypeScript);
            gulp.task("watch", ["compile", "watch:dts"]);
        }

        // raccourcis
        gulp.task("w", ["watch"]);

        /**
         * Fonction permettant d'enrichir l'objet de configuration
         */
        function buildConf() {
            conf.sourcesDTS = ["**/*.d.ts"].map(prepend(conf.src));

            var sourcesAndTestsDts = _.flatten(["**/*.d.ts"].map(prepend(conf.src, conf.test)));

            conf.sourcesTS = _.flatten(["**/*.ts", "**/*.tsx"].map(prepend(conf.src, conf.test))).concat("index.ts");
            conf.targetTS = "." + path.sep;

            var extensionsToClean = [];
            if (helper.isIDE()) {
                extensionsToClean = [];
                conf.postTSClean = [];
            } else {
                extensionsToClean = ["**/*.js*", "**/*.d.ts"].concat("index.js").concat("index.js.map");
                conf.postTSClean = sourcesAndTestsDts;
            }

            conf.testSourcesBase = conf.testWorkDir;
            conf.testSources = ["**/*{-spec,-test}.{js,jsx}"]
                .map(prepend(path.join(conf.testSourcesBase, conf.test)));

            conf.allSources = _.flatten(["**/*.*js*", "!**/*.js.map"].map(prepend(conf.src, conf.test))).concat("index.js");

            // Fichiers JS à instrumenter pour la mesure de la couverture de code
            conf.instrumentableSourcesBase = conf.testSourcesBase;
            conf.instrumentableSources = ["**/*.{js,jsx}"].map(prepend(path.join(conf.instrumentableSourcesBase, conf.src)));

            // Build webpack
            conf.targetClientJs = path.join(conf.src, conf.clientJs);

            // Gestion du clean
            conf.cleanElements =
                extensionsToClean.map(prepend(conf.src))
                    .concat([
                        conf.mocha.reporterOptions.output,
                        path.join(conf.static, conf.js)
                    ])
                    // sauf les fichiers JS "forkés", les JSX, les fichiers JSON
                    .concat(["extended/*.js", "**/*.json", "**/*.jsx"].map(prepend("!" + conf.src)));

            conf.cleanTestElements = [
                testWorkDir,
                "target"
            ]
                .concat(extensionsToClean.map(prepend(conf.test)))
                .concat(["extended/*.js", "**/*.json", "**/*.jsx"].map(prepend("!" + conf.test)));

            conf.complementarySpaSources = ["*.json"].map(prepend(path.join(conf.src, "resources")))
                .concat(["*.json"].map(prepend(conf.config)));

            conf.istanbulOpt["coverageVariable"] = conf.istanbul["coverageVariable"] = "___" + project.name.replace(/-/g, "_") + "___";

            helper.debug("Configuration du applicationAndModuleBuilder:", conf);
        }

        /**
         * Fonction retournant une fonction de mapping ajoutant les arguments avant ceux du tableau sur lequel s'applique le mapping
         * @param ...args les arguments à ajouter
         * @returns {Function}
         */
        function prepend() {
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
         * Fonction retournant une fonction de mapping ajoutant les arguments après ceux du tableau sur lequel s'applique le mapping
         * @param ...args les arguments à ajouter
         * @returns {Function}
         */
        function append() {
            var args = Array.prototype.slice.call(arguments, 0);
            return function (element) {
                if (args.length === 1) {
                    if (args[0] === "!") {
                        return element + args[0];
                    } else {
                        return path.join(element, args[0]);
                    }
                } else {
                    return args.map(function (argElement) {
                        return path.join(element, argElement);
                    });
                }
            };
        }

        /**
         * Fonction gulp permettant de supprimer des fichiers
         * @param patterns
         * @returns {Function}
         */
        function gulpDelete(patterns) {
            return function (cb) {
                del(patterns, function (err, deletedFiles) {
                    if (deletedFiles) {
                        deletedFiles.forEach(function (file) {
                            helper.debug("File deleted:", file);
                        });
                    }
                    // nécessaire pour que les tâches suivantes attendent la fin du nettoyage
                    cb(err);
                });
            };
        }


    }
};
