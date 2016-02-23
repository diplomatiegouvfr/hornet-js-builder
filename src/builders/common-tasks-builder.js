"use strict";


var path = require("path");
var fs = require("fs");
var npm = require("npm");
var through = require("through2");
var promise = require("promise");
var _ = require("lodash");
var gutil = require("gulp-util");
var os = require("os");
var lnk = require("lnk");

/**
 * Module permettant de gérer les tâches communes :
 *   > gestion des dépendances
 *   > gestion du publish / unpublish
 */
module.exports = {
    gulpTasks: function (gulp, project, conf, helper) {
        var state = {
            report: null,
            appDependenciesChanged: true,
            testDependenciesChanged: true
        };

        // Gestion du resolving des modules issus du parent
        var autoResolved = {};
        helper.getExternalModules(project).forEach(function(mod) {
            autoResolved[mod.name] = mod;
            helper.info("Auto resolving module '" + mod.name + "@" + mod.version + " in '" + mod.dir + "'")
        });


        function cleanAppNodeModules(done) {
            helper.removeDir(path.join(project.dir, helper.NODE_MODULES_APP));
            done();
        }

        function cleanBuildAndTestNodeModules(done) {
            helper.removeDir(path.join(project.dir, helper.NODE_MODULES_TEST));
            done();
        }

        function cleanNodeModules(done) {
            helper.removeDir(path.join(project.dir, helper.NODE_MODULES));
            done();
        }

        function checkAppDependencies(done) {
            var root = project.packageJson;
            var ok = true;
            helper.each(root[helper.APP_DEPENDENCIES], function(version, key) {
                if (!helper.isValidVersion(version)) {
                    ok = false;
                    helper.error("Version '" + version + "' interdite pour la dépendance '" + key + "' ==> vous devez utiliser une version figée");
                }
            });
            if (ok) done();
            else {
                throw new Error("Erreur de versions")
            }
        }

        function checkTsDefinitionDependencies(done) {
            var root = project.packageJson;
            var ok = true;
            helper.each(root[helper.TS_DEFINITIONS_DEPENDENCIES], function(version, key) {
                if (!helper.isValidVersion(version)) {
                    ok = false;
                    helper.error("Version '" + version + "' interdite pour la dépendance de definition typescript '" + key + "' ==> vous devez utiliser une version figée");
                }
            });
            if (ok) done();
            else {
                throw new Error("Erreur de versions")
            }
        }

        function cleanFixedDependencies(done) {
            if (helper.isForce()) {
                var packageJsonPath = path.join(project.dir, "package.json");
                var root = project.packageJson;
                delete root[helper.HB_JSON_KEY];
                fs.writeFile(packageJsonPath, JSON.stringify(root, null, 2), function (err) {
                    if (err) helper.error("Erreur de mise à jour du fichier 'package.json' !!");
                });
                done();
            } else {
                throw new Error("'dependencies:clean-fix' ne peut être exécutée qu'en mode forcé (option -f)");
            }
        }

        function detectAppDependenciesChanges(done) {
            var root = project.packageJson;
            var hash = helper.getDependenciesHash(root);
            var diff = false;
            if (root[helper.APP_DEPENDENCIES] && Object.keys(root[helper.APP_DEPENDENCIES]).length > 0 && (
                !(helper.HB_JSON_KEY in root) ||
                !("current" in root[helper.HB_JSON_KEY]) ||
                !("history" in root[helper.HB_JSON_KEY]) ||
                !(hash in root[helper.HB_JSON_KEY].history) ||
                hash != root[helper.HB_JSON_KEY].current)) {

                helper.info("Modification détectée sur les dépendances > on recalcule les dépendances (new_hash="+hash+")");
                diff = true;
            } else {
                if (root[helper.APP_DEPENDENCIES] && Object.keys(root[helper.APP_DEPENDENCIES]).length > 0 && (
                    !helper.folderExists(path.join(project.dir, helper.NODE_MODULES)) ||
                    !helper.folderExists(path.join(project.dir, helper.NODE_MODULES_APP)))) {

                    helper.info("Dépendances à installer");
                    diff = true;
                } else if (helper.isForce()) {

                    helper.info("Dépendances à réinstaller en force");
                    diff = true;
                } else {
                    helper.info("Dépendances à jour > rien à faire (si ce n'est pas le cas ajouter l'option -f pour forcer la réinstallation des dépendances)");
                }
            }
            state.appDependenciesChanged = diff;
            done();
        }

        function fixAppDependencies(done) {
            if (!state.appDependenciesChanged) { return done(); }

            var packageJsonPath = path.join(project.dir, "package.json");
            var root = project.packageJson;
            var rootStr = root.name + "@" + root.version;
            helper.getDependenciesReport(npm, root, autoResolved, function(report) {
                function end() {
                    state.report = report;
                    done();
                }

                var rootReport = report[root.name][root.version];
                var mergedDeps = helper.mergeReportDependencies(root, report);

                // on extrait les nouvelles versions à fixer
                var newFixed = {};
                helper.forEach3Depth(mergedDeps, function(name, version, issuer) {
                    if (version != mergedDeps[name][version][issuer]) {
                        newFixed[name] = {};
                        newFixed[name][version] = {};
                        newFixed[name][version][rootStr] = 1;
                    }
                });

                if (!(helper.HB_JSON_KEY in root)) root[helper.HB_JSON_KEY] = {
                    current: "",
                    history: {}
                };

                // on vérifie si on doit sauvegarder le package.json
                var saveJson = false;
                var depsHash = helper.getDependenciesHash(root);
                if (Object.keys(newFixed).length > 0 || !root[helper.HB_JSON_KEY].history[depsHash]) {
                    saveJson = true;
                    root[helper.HB_JSON_KEY].current = depsHash;

                    var allFixed = {};
                    helper.forEach1Depth(rootReport.fixed, function (name, version) {
                        allFixed[name] = version;
                    });
                    helper.forEach2Depth(newFixed, function (name, version) {
                        allFixed[name] = version;
                    });
                    allFixed = helper.sortObj(allFixed);
                    root[helper.HB_JSON_KEY].history[depsHash] = {
                        date: new Date(),
                        deps: allFixed
                    };

                } else if (root[helper.HB_JSON_KEY]) {
                    // cas d'un hash déjà présent > on actualise la date de l'historique
                    if (root[helper.HB_JSON_KEY].current && depsHash != root[helper.HB_JSON_KEY].current) {
                        root[helper.HB_JSON_KEY].current = depsHash;
                        root[helper.HB_JSON_KEY].history[depsHash].date = new Date();
                        saveJson = true;
                    }
                }

                // On sauvegarde le package.json si nécessaire
                if (saveJson) {
                    // on trie l'historique afin que le courant soit le dernier
                    root[helper.HB_JSON_KEY].history = helper.sortObj(root[helper.HB_JSON_KEY].history, function(h1, h2) {
                        var d1 = new Date(h1.value.date);
                        var d2 = new Date(h2.value.date);
                        return d1 < d2 ? -1 : d1 > d2 ? 1 : 0;
                    });
                    helper.stream(
                        end,
                        gulp.src(["package.json"])
                            .pipe(packageJsonFormatter())
                            .pipe(gulp.dest("."))
                    );
                } else {
                    end();
                }
            });
        }

        function installTsDefinitionDependencies(done) {
            var root = project.packageJson;
            var myPromise = new promise(function(resolve, reject) { resolve(); });
            helper.each(root[helper.TS_DEFINITIONS_DEPENDENCIES], function(version, name) {
                myPromise = myPromise.then(function(resolve, reject) {
                    var targetPath = path.join(helper.TS_DEFINITIONS_DEPENDENCIES_PATH, name);
                    if (!helper.folderExists(helper.TS_DEFINITIONS_DEPENDENCIES_PATH)) {
                        fs.mkdirSync(helper.TS_DEFINITIONS_DEPENDENCIES_PATH);
                    }

                    if (name in autoResolved && version == autoResolved[name].version) {
                        // on créé un lien symbolique !!
                        return new promise(function(resolve, reject) {
                            // en mode resolver : on supprime / recréé systématiquement
                            if (helper.folderExists(targetPath)) helper.removeDir(targetPath);

                            lnk.sync(autoResolved[name].dir, helper.TS_DEFINITIONS_DEPENDENCIES_PATH);
                            resolve();
                        });
                    } else {

                        // si la dépendance est déjà présente, on saute sauf si c'est un lien symbolique > on supprime
                        if (helper.folderExists(targetPath)) {
                            if (helper.isSymlink(targetPath)) helper.removeDir(targetPath);
                            else return new promise(function(resolve, reject) { resolve(); })
                        }

                        // on l'installe manuellement
                        return helper.installAppDependency(npm, name, version, path.join(helper.TS_DEFINITIONS_DEPENDENCIES_PATH, name), autoResolved);
                    }
                });
            });
            myPromise.catch(function(err) {
                helper.error("Erreur durant l'installation des dépendances de définition typescript : " + err)
            });
            myPromise.then(function(resolve) { done(); });
        }

        function installAppDependencies(done) {
            if (!state.appDependenciesChanged) { return done(); }

            var root = project.packageJson;
            var dependencies = helper.getFinalDependencies(state.report, root);
            var toRemove = {}, toInstall = {}, toUpdate = {};

            // on analyse ce qu'il y a à supprimer / installer
            var installedDependencies = helper.getInstalledAppDependencies(project.dir, autoResolved);
            helper.each(installedDependencies, function(version, name) {
                if (name in autoResolved && version == autoResolved[name].version) return;

                if (!(name in dependencies)) {
                    toRemove[name] = version;
                } else if (version != dependencies[name]) {
                    toUpdate[name] = version;
                }
            });
            helper.each(dependencies, function(version, name) {
                if (!(name in installedDependencies)) {
                    toInstall[name] = version;
                }
            });
            toRemove = helper.sortObj(toRemove);
            toUpdate = helper.sortObj(toUpdate);
            toInstall = helper.sortObj(toInstall);

            helper.debug("Dépendances à supprimer : ", toRemove);
            helper.debug("Dépendances à mettre à jour : ", toUpdate);
            helper.debug("Dépendances à installer : ", toInstall);

            // on créé les répertoires si besoin
            if (Object.keys(toInstall).length > 0) {
                if (!helper.folderExists(helper.NODE_MODULES)) {
                    fs.mkdirSync(helper.NODE_MODULES);
                }
                if (!helper.folderExists(helper.NODE_MODULES_APP)) {
                    fs.mkdirSync(helper.NODE_MODULES_APP);
                }
            }

            // suppression des dépendances installées inutiles
            helper.each(toRemove, function(version, name) {
                helper.info("Suppression de la dépendance installée '" + name + "@" + version + "' car inutile");
                helper.removeDir(path.join(project.dir, helper.NODE_MODULES_APP, name));
            });

            var myPromise = new promise(function(resolve, reject) { resolve(); });

            // suppression des dépendances à mettre à jour
            helper.each(toUpdate, function(version, name) {
                myPromise = myPromise.then(function(resolve, reject) {
                    var modulePath = path.join(project.dir, helper.NODE_MODULES_APP, name);
                    helper.info("Suppression de la dépendance installée '" + name + "@" + version + "' car à mettre à jour en version '" + dependencies[name] + "'");
                    helper.removeDir(modulePath);
                    return helper.installAppDependency(npm, name, dependencies[name], path.join(helper.NODE_MODULES_APP, name), autoResolved);
                });
            });


            var idx = 0, nDeps = Object.keys(toInstall).length;
            // installation des nouvelles dépendances
            helper.each(toInstall, function(version, name) {
                myPromise = myPromise.then(function(resolve, reject) {
                    helper.info("Installation de la dépendance " + (++idx) + "/" + nDeps + " : '" + name + "@" + version + "'");
                    return helper.installAppDependency(npm, name, dependencies[name], path.join(helper.NODE_MODULES_APP, name), autoResolved);
                });
            });
            myPromise.catch(function(err) {
                helper.error("Erreur durant l'installation des dépendances applicatives : " + err)
            });
            myPromise.then(function(resolve) { done(); });
        }

        function packageJsonFormatter() {
            return through.obj(function (file, enc, cb) {
                if (file.isNull()) {
                    cb(null, file);
                    return;
                }

                if (file.isStream()) {
                    cb(new gutil.PluginError("packageJsonFormatter", "Streaming not supported"));
                    return;
                }

                try {
                    var hashes = [];
                    var packageJsonCopy = _.merge({}, project.packageJson);
                    Object.keys(packageJsonCopy[helper.HB_JSON_KEY].history).forEach(function(hash) {
                        packageJsonCopy[helper.HB_JSON_KEY].history[hash].deps = {};
                        hashes.push(hash);
                    });
                    var checkreplace = false;
                    var replaceIdx = -1;
                    var lines = JSON.stringify(packageJsonCopy, null, 2).split("\n");
                    var hashIdx = 0;
                    for (var i=0;i<lines.length;i++) {
                        if (lines[i].indexOf(helper.HB_JSON_KEY) != -1) {
                            for (var j=0;j<5;j++) {
                                lines.splice(i, 0, "");
                                i++;
                            }
                            checkreplace = true;
                        } else if (lines[i].indexOf(hashes[hashIdx]) != -1) {
                            replaceIdx = hashIdx;
                        } else if (replaceIdx != -1 && lines[i].indexOf("\"deps\": {}") != -1) {
                            lines[i] = lines[i].replace("{}", JSON.stringify(project.packageJson[helper.HB_JSON_KEY].history[hashes[hashIdx]].deps));
                            hashIdx++;
                            replaceIdx = -1;
                        }
                    }
                    file.contents = new Buffer(lines.join(os.EOL));
                    this.push(file);
                } catch (err) {
                    this.emit("error", new gutil.PluginError("packageJsonFormatter", err, {
                        fileName: file.path
                    }));
                }
                cb();
            });
        }



        // Dependencies tasks
        gulp.task("dependencies:clean",[], cleanAppNodeModules);
        gulp.task("dependencies:clean-build",[], cleanBuildAndTestNodeModules);
        gulp.task("dependencies:clean-all",[], cleanNodeModules);

        gulp.task("dependencies:check-app", [], checkAppDependencies);
        gulp.task("dependencies:check-ts-definition", [], checkTsDefinitionDependencies);

        gulp.task("dependencies:clean-fix", [], cleanFixedDependencies);

        gulp.task("dependencies:change-app", ["dependencies:check-app"], detectAppDependenciesChanges);

        gulp.task("dependencies:fix-app", ["dependencies:change-app"], fixAppDependencies);

        gulp.task("dependencies:install-ts-definition", ["dependencies:check-ts-definition"], installTsDefinitionDependencies);
        gulp.task("dependencies:install-app", ["dependencies:fix-app"], installAppDependencies);
        gulp.task("dependencies:install", ["dependencies:install-ts-definition", "dependencies:install-app"]);
        gulp.task("install", ["dependencies:install"]);

        // Publishing tasks
        gulp.task("publish", function(done) { helper.npmPublish(npm, project.dir, done); });
        gulp.task("unpublish", function(done) { helper.npmUnpublish(npm, project.name, project.version, done); });

    }
};
