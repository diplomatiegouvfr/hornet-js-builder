"use strict";
const helper = require("../../../../helpers");
const Task = require("./../../task");
const path = require("path");
const fs = require('fs-extra');
const State = require("../../../state");


class InstallDependencies extends Task {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        /*this.addOn = {
            sqlite3: "--build-from-source"
        }*/
        this.addOn = {
        }
    }

    /**
     * Installe une dépendance app dans un répertoire spécifique (décompactage sans sous-dépendances)
     * @param npm
     * @param dependencyName
     * @param dependencyVersion
     * @param targetDir
     */
    installAppDependency(project, npm, dependencyName, dependencyVersion, targetDir, resolvedFromParent) {
        return new Promise( (resolve, reject) => {
            
            var up = npm.config.get("unsafe-perm");
            var user = up ? null : npm.config.get("user");
            var group = up ? null : npm.config.get("group");

            npm.commands.cache.unpack(dependencyName, dependencyVersion, targetDir, null, null, user, group, function (err) {
                   
                if (err) {
                    console.error("Erreur durant l'installation de la dépendance '" + dependencyName + "@" + dependencyVersion + "' dans le répertoire '" + targetDir + "' : ", err);
                    reject(err);
                }
                else {
                    if (helper.fileExists(path.join(project.dir, targetDir, "package.json"))) {
                        let pjson = require(path.join(project.dir, targetDir, "package.json"));
                        if (pjson.binary && pjson.binary.host) {
                            helper.removeDir(targetDir);
                                                
                            helper.info("Reinstallation de la dépendance (script install) " + dependencyName + "@" + dependencyVersion );
                            helper.debug("Verification existance (script install) " + path.join(State.prefix, helper.NODE_MODULES, dependencyName) );

                            npm.config.list[0]["node_" + dependencyName +"_binary_host_mirror"] = npm.config.get("registry");

                            npm.commands.install(path.join(targetDir, ".."), [dependencyName + "@" + dependencyVersion], (err) => { 
                                if (err) {
                                    helper.warn("Erreur durant l'installation de la dépendance : " + dependencyName + ", ERROR: "+ err);
                                }
                                
                                return resolve();

                            });
                        } else {
                            resolve()
                        }

                    } else {
                        resolve()
                    }
                }
            });
        });
    }
}

module.exports = InstallDependencies;