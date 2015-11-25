"use strict";
module.exports = {
    gulpTasks: function (gulp, project, conf, helper) {
        var path = require("path");
        var del = require("del");
        var promise = require("promise");
        var streamqueue = require("streamqueue");
        var fs = require("fs");
        var zip = require("gulp-zip");
        var childProcess = require("child_process");
        var _ = require("lodash");
        var uglifycss = require("uglifycss");
        var mapStream = require("map-stream");

        var targetDir = "bin";
        var defaultConf = {
            src: "src",
            targetDir: targetDir,
            depDir: "_dep",
            modules: {},
            zipName: project.name + "-" + project.version + ".zip",
            projectPrefix: "hornet-themes",
            exludeComponents: "!/**/components{,/**}",
            excludeCss: ["!/**/*.css", "!/**/css{,/**}"]
        };

        conf = _.merge({}, defaultConf, conf, project.builderJs.conf);


        conf.workDir = path.join(targetDir, "work-" + project.version);
        conf.depPackageDir = path.join(targetDir, project.version);
        conf.packageDir = path.join(targetDir, project.version, conf.nomTheme);
        conf.runServeurCmd = 'node ' + path.resolve(conf.baseDir, '..', 'server-themes.js');


        //
        // Les micro étapes Gulp
        //
        // Nettoyage du répertoire target
        gulp.task("clean", cleanTaskFn);

        // Copie nos sources dans target, dans le répertoire work
        gulp.task("prepare:work-copy-src", ["clean"], prepareWorkCopySrc);

        // Copie les sources des dépendances, dans le répertoire work
        var depTasksWork = [];
        var depTasksPackage = [];

        helper.each(conf.modules, function (version, module) {
            helper.info("Module en cours de traitement : ", module);
            var moduleDir = path.join(helper.NODE_MODULES_APP, module)

            var depTaskWork = "prepare:work-copy-" + module;
            // Copie les sources "du module" dans le "target", dans le même répertoire work
            // on met le dossier du module au même format que nos thèmes
            gulp.task(depTaskWork, ["prepare:work-copy-src"], prepareWorkCopyModule2(module, moduleDir));

            depTasksWork.push(depTaskWork);

            var depTaskPackage = "prepare:package-merge-" + module;

            // Merge les dépendances, sans leurs css
            gulp.task(depTaskPackage, ["prepare:package-merge-components"], preparePackageMergeModule(module, moduleDir));

            depTasksPackage.push(depTaskPackage);
        });

        helper.each(project.packageJson[helper.APP_DEPENDENCIES], function (version, module) {
            helper.info("Dépendance en cours de traitement : ", module);

            if (module.indexOf(conf.projectPrefix) >= 0) {
                var depTaskWork = "prepare:work-copy-" + module;

                // Copie les sources d"un autre thème dans target (thème commun ou autre)
                var depTarget = path.join(helper.NODE_MODULES_APP, module, conf.targetDir);
                gulp.task(depTaskWork, ["prepare:work-copy-src"], prepareWorkCopyModule(module, depTarget));

                depTasksWork.push(depTaskWork);

                var depTaskPackage = "prepare:package-merge-" + module;

                // Merge les dépendances, sans leurs css
                gulp.task(depTaskPackage, ["prepare:package-merge-components"], preparePackageMergeModule(module, null));

                depTasksPackage.push(depTaskPackage);
            } else {
                helper.info("Dépendance non gérée par les thèmes : ", module, version);
            }
        });

        // Copie le thème courant, sans ses composants, sans les css
        gulp.task("prepare:package-merge-main", depTasksWork, preparePackageMergeMain);

        // Merge les composants, sans leurs css
        gulp.task("prepare:package-merge-components", ["prepare:package-merge-main"], preparePackageMergeComponents);

        gulp.task("prepare:package-merge-css", depTasksPackage, concatMinifyFiles);

        // Assemble tous les fichiers css du commun et du template et copie le fichier css final dans le répertoire de package
        gulp.task("compile", ["clean", "prepare:package-merge-css"]);

        // Zip le répertoire de package pour créer une archive à déposer sur le CDN
        gulp.task("package", ["dependencies:install", "compile"], zipTaskFn);

        gulp.task("default", ["package"]);

        // Tâches de dev pour lancer le serveur et monitorer les modifs des sources
        gulp.task("watch", ["compile"], watchFiles);
        gulp.task("w", ["watch"]);
        gulp.task("start", ["watch"], execCmd(conf.runServeurCmd + " " + path.join(conf.baseDir, conf.targetDir), conf.baseDir));


        //
        // Fonctions associées aux micro étapes
        //
        // Gestion du clean des target
        function cleanTaskFn(done) {
            var filesToDelete = [conf.targetDir];
            del(filesToDelete, function (err, deletedFiles) {
                if (deletedFiles) {
                    deletedFiles.forEach(function (file) {
                        helper.debug("Fichier supprimé : ", file);
                    });
                }
                console.log("suppression terminées ")
                done(err);
            });
        }

        function prepareWorkCopySrc(done) {
            copyFiles(
                [conf.src + "/public/**/*"],
                path.join(conf.src, "public"),
                path.join(conf.workDir, conf.nomTheme),
                done
            );
        }

        function prepareWorkCopyModule(module, depTarget) {
            return function(done) {
                copyFiles(
                    depTarget + "/**",
                    path.join(depTarget, project.version),
                    path.join(conf.workDir, conf.depDir, module),
                    done
                );
            };
        }

        function prepareWorkCopyModule2(module, moduleDir) {
            return function(done) {
                copyFiles(
                    moduleDir + "/*-min.css",
                    moduleDir,
                    path.join(conf.workDir, conf.depDir, module, "/css"),
                    done
                );
            };
        }

        function preparePackageMergeModule(module, moduleDir) {
            return function(done) {
                copyFiles(
                    [path.join(conf.workDir, conf.depDir, module, "/**")].concat(conf.excludeCss),
                    path.join(conf.workDir, conf.depDir, module),
                    conf.packageDir,
                    done
                );
            }
        }

        function preparePackageMergeComponents(done) {
            copyFiles(
                [conf.workDir + "/" + conf.nomTheme + "/components/**"].concat(conf.excludeCss),
                path.join(conf.workDir, conf.nomTheme, "components"),
                conf.packageDir,
                done
            );
        }

        function preparePackageMergeMain(done) {
            copyFiles(
                [conf.workDir + "/" + conf.nomTheme + "/**/*",conf.exludeComponents].concat(conf.excludeCss),
                conf.workDir + "/" + conf.nomTheme,
                conf.packageDir,
                done
            );
        }

        function copyFiles(sources, base, target, done) {
            helper.stream(
                done,
                gulp.src(sources, {
                    base: base || conf.src
                })
                    .pipe(gulp.dest(target || conf.targetDir))
            );
        }

        // Utilise le répertoire de travail comme dossier source,
        // concat et minifie les sources, puis crée l"arbo cible qui sera zippée
        function concatMinifyFiles(done) {
            var sources = conf.workDir;
            var base = conf.workDir;
            var target = conf.packageDir + "/css";
            helper.info("Minification des themes..");

            // Utilisation des promise pour chainer des actions asynchrones séquentiellement
            // Récupère la liste des fichiers css du dossier work
            var execution = getAllFilesFromSource([sources + "/**/*.css"], base);

            // Minifie les fichiers et enregistre dans le répertoire package
            execution = execution.then(function (files) {
                files.sort();
                helper.debug("Array: ", files);
                var minCss = uglifycss.processFiles(files);
                if (!helper.folderExists(target)) {

                    fs.mkdirSync(path.join(project.dir, target));
                }

                fs.writeFileSync(path.join(target, "theme.css"), minCss);
                helper.info("Fichier créé : ", path.join(target, "theme.css"));

                done();
            });
            execution.catch(function(err) {
                helper.error("Erreur : " + err);
            });
            return execution;
        }

        //Fonction utilitaire qui liste récursivement tous les fichiers -d"un dossier et ses sous dossiers-
        function getAllFilesFromSource(src, base) {
            return new promise(function (resolveFn, rejectFn) {
                var files = [];
                // Liste tous les fichiers css et les ajoute au tableau
                gulp.src(src, {
                    base: base
                }).pipe(mapStream(function (file, cb) {
                    files.push(file.path);
                    cb(null, file);
                })).on("end", function () {
                    helper.debug("Fin de lecture des fichiers");
                    resolveFn(files);
                });
            });
        }


        // Surveille les modifications des sources et lance une tâche gulp
        function watchFiles(done) {
            helper.stream(
                done,
                gulp.watch(conf.src + "/**/*.css", ["compile"])
            );
        }

        // Gestion du packaging en .zip
        function zipTaskFn(done) {
            helper.stream(
                done,
                streamqueue({
                    objectMode: true
                })
                .queue(
                        gulp.src(conf.packageDir + "/**/*", {
                            base: conf.targetDir
                        })
                ).done().pipe(zip(conf.zipName)).pipe(gulp.dest(conf.targetDir))
            );
        }

        /**
         * Execute une commande dans un process fils
         * @param commande la commande à exécuter
         * @param projectDir le working dir
         * @returns {Function}
         */
        function execCmd(commande, projectDir) {
            return function (done) {
                helper.debug(commande, projectDir);
                var cmd = childProcess.exec(commande, {cwd: projectDir}, function (err) {
                    done(err);
                });

                cmd.stdout.on("data", function (data) {
                    helper.debug(data);
                });
                cmd.stderr.on("data", function (data) {
                    helper.debug(data);
                });
            };
        }

    }
};



