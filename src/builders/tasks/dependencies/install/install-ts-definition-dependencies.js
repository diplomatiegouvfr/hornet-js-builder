"use strict";
const path = require("path");
const fs = require("fs");
const lnk = require("lnk");
const npm = require("npm");

const InstallDependencies = require("./install-dependencies");
const State = require("../../../state");

class InstallTSDefinitionDependencies extends InstallDependencies {

    task(gulp, helper, conf, project) {
        return (done) => {
            var root = project.packageJson;
            var myPromise = new Promise((resolve, reject) => {
                resolve();
            });
            helper.each(root[helper.TS_DEFINITIONS_DEPENDENCIES], (version, name) => {
                myPromise = myPromise.then((resolve, reject) => {
                    var targetPath = path.join(path.join(project.dir, helper.TS_DEFINITIONS_DEPENDENCIES_PATH, name));
                    if (!helper.folderExists(helper.TS_DEFINITIONS_DEPENDENCIES_PATH)) {
                        fs.mkdirSync(helper.TS_DEFINITIONS_DEPENDENCIES_PATH);
                    }

                    if (name in State.externalDependencies[project.name] && version == State.externalDependencies[project.name][name].version) {
                        // on créé un lien symbolique !!
                        return new Promise((resolve, reject) => {
                            // en mode resolver : on supprime / recréé systématiquement
                            if (helper.folderExists(targetPath) || helper.isSymlink(targetPath)) helper.removeDir(targetPath);
                            lnk.sync(State.externalDependencies[project.name][name].dir, helper.TS_DEFINITIONS_DEPENDENCIES_PATH, {type: "junction"});
                            resolve();
                        });
                    } else {

                        // si la dépendance est déjà présente, on saute sauf si c'est un lien symbolique > on supprime
                        if (helper.folderExists(targetPath) || helper.isSymlink(targetPath)) {
                            if (helper.isSymlink(targetPath)) helper.removeDir(targetPath);
                            else return new Promise((resolve, reject) => {
                                resolve();
                            })
                        }

                        // on l'installe manuellement
                        return this.installAppDependency(project, npm, name, version, path.join(helper.TS_DEFINITIONS_DEPENDENCIES_PATH, name), State.externalDependencies[project.name]);
                    }
                });
            });
            myPromise.catch((err) => {
                helper.error("Erreur durant l'installation des dépendances de définition typescript : " + err)
            });
            myPromise.then((resolve) => {
                done();
            });
        }
    }
}

module.exports = InstallTSDefinitionDependencies;