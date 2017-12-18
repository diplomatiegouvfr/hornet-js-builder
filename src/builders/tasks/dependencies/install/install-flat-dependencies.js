"use strict";

const InstallDependencies = require("./install-dependencies");
const State = require("../../../state");
const fs = require("fs");
const npm = require("npm");
const path = require("path");


class InstallTDependencies extends InstallDependencies {

    task(gulp, helper, conf, project) {
        return (done) => {

            if (State.testDependenciesInstalled && State.testDependenciesInstalled[project.name]) {
                helper.info("Dépendances de test déjà installées");
                return done();
            }

            var root = project.packageJson;
            var dependencies = helper.getFinalDependencies(State.report, root);
            var toRemove = {}, toInstall = {}, toUpdate = {};

            // on analyse ce qu'il y a à supprimer / installer
            var installedDependencies = helper.getInstalledTestDependencies(project.dir, State.externalDependencies[project.name]);
            helper.each(installedDependencies, (version, name) => {
                if (name in State.externalDependencies[project.name] && version == State.externalDependencies[project.name][name].version) return;

                if (!(name in dependencies)) {
                    toRemove[name] = version;
                } else if (version != dependencies[name]) {
                    toUpdate[name] = version;
                }
            });
            helper.each(dependencies, (version, name) => {
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
                if (!helper.folderExists(helper.NODE_MODULES_TEST)) {
                    fs.mkdirSync(helper.NODE_MODULES_TEST);
                }
            }

            // suppression des dépendances installées inutiles
            helper.each(toRemove, (version, name) => {
                helper.info("Suppression de la dépendance installée '" + name + "@" + version + "' car inutile");
                helper.removeDir(path.join(project.dir, helper.NODE_MODULES_TEST, name));
            });

            var myPromise = new Promise((resolve, reject) => { resolve(); });

            // suppression des dépendances à mettre à jour
            helper.each(toUpdate, (version, name) => {
                myPromise = myPromise.then((resolve, reject) => {
                    var modulePath = path.join(project.dir, helper.NODE_MODULES_TEST, name);
                    helper.info("Suppression de la dépendance installée '" + name + "@" + version + "' car à mettre à jour en version '" + dependencies[name] + "'");
                    helper.removeDir(modulePath);
                    return this.installAppDependency(project, npm, name, dependencies[name], path.join(helper.NODE_MODULES_TEST, name), State.externalDependencies[project.name]);
                });
            });


            var idx = 0, nDeps = Object.keys(toInstall).length;
            // installation des nouvelles dépendances
            helper.each(toInstall, (version, name) => {
                myPromise = myPromise.then((resolve, reject) => {
                    helper.info("Installation de la dépendance " + (++idx) + "/" + nDeps + " : '" + name + "@" + version + "'");
                    return this.installAppDependency(project, npm, name, dependencies[name], path.join(helper.NODE_MODULES_TEST, name), State.externalDependencies[project.name]);
                });
            });
            myPromise.catch((err) => {
                helper.error("Erreur durant l'installation des dépendances de test : " + err)
            });
            return myPromise.then(() => {
                new Promise((resolve, reject) => {
                    
                    if (helper.folderExists(path.join(project.dir, helper.NODE_MODULES_TEST, helper.NODE_MODULES))) {
                        helper.readDirRecursiveAndCallBackOnDir(path.join(project.dir, helper.NODE_MODULES_TEST, helper.NODE_MODULES),  (dir, file) => {
                            if (!helper.folderExists(path.join(project.dir, helper.NODE_MODULES_TEST, file))) {
                                fs.rename( path.join(dir, file),  path.join(project.dir, helper.NODE_MODULES_TEST, file), function (err) {
                                    if (err) {
                                        helper.error("Reinstallation : Erreur pour deplacer : " + file + " ERROR: "+ err);
                                        reject("Reinstallation : Erreur pour deplacer : " + err);
                                    } 
                                });
                            } else {
                                helper.warn("Reinstallation : Le module cible existe déjà : " + file );
                            }
                            return false;
                        });
                    } 
                    resolve();
                });
            }).then((resolve) => {
                if (helper.folderExists(path.join(project.dir, helper.NODE_MODULES_TEST, helper.NODE_MODULES))) {
                    helper.removeDir(path.join(project.dir, helper.NODE_MODULES_TEST, helper.NODE_MODULES));
                }
                if (!State.testDependenciesInstalled) {
                    State.testDependenciesInstalled = {};
                }
                State.testDependenciesInstalled[project.name] = true;
                done();
            });
        }
    }
}


module.exports = InstallTDependencies;