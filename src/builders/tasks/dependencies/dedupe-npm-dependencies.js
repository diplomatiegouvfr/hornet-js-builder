"use strict";

const InstallDependencies = require("./install/install-dependencies");
const State = require("../../state");
const fs = require("fs");
const path = require("path");
const ModuleHelper = require("../../../module-helpers");

class DedupeNpmDependencies extends InstallDependencies {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            if(helper.isSkipDedupe() || !State.externalDependencies || !State.externalDependencies[project.name] || Object.keys(State.externalDependencies[project.name]).length == 0) {
                return done();
            }
            
            // let removeLink = {}, toLink={};

            let myPromise = new Promise((resolve, reject) => { resolve(); });

            // let modules = ModuleHelper.dedupeArborescence(project.dir, project, conf);
            // for(let attr in modules) {
                
            //         if(modules[attr].dirs.length > 1 && State.externalDependencies[project.name][modules[attr].name]) {
                        
            //                 let dirOne = modules[attr].dirs[0];
            //                 let dirTwo = "";
            //                 for(let idxTwo = 1; idxTwo < modules[attr].dirs.length; idxTwo++) {
            //                     dirTwo = modules[attr].dirs[idxTwo];
            //                     do {
            //                         do {
            //                             dirTwo = path.dirname(dirTwo);
            //                             while(dirOne.length < dirTwo.length) {
            //                                 dirTwo = path.dirname(dirTwo);
            //                             }
            //                             while(dirOne.length > dirTwo.length) {
            //                                 dirOne = path.dirname(dirOne);
            //                             }
            //                         } while (dirOne.length !== dirTwo.length)
            //                     } while (dirOne!== dirTwo)
            //                 }
            //                 toLink[modules[attr].name] = dirOne;

            //                 modules[attr].dirs = modules[attr].dirs.filter(dir => dir !== path.join(dirOne, modules[attr].name));
                        
            //             removeLink[attr] = {...modules[attr]};
            //         }
            //     //}
            // }

            // var idxLink = 0, nDepsLink = Object.keys(toLink).length;
            // var idxUnlink = 0, nDepsUnlink = Object.keys(removeLink).length;

            // let unlinkDependencies = {dirs: [], names: []};
            // for(let mod in removeLink) {
            //     helper.each(removeLink[mod].dirs, (dir) => {
            //         unlinkDependencies.dirs.push(dir);
            //         unlinkDependencies.names.push(removeLink[mod].name);
            //     });

            // }

            // let linkDependencies = {dirs: [], names: [], destDirs:[], moduleTargets:[]};
            // helper.each(toLink, (dest, name) => {
            //     linkDependencies.dirs.push(State.externalDependencies[project.name][name].dir);
            //     linkDependencies.names.push(name);
            //     linkDependencies.destDirs.push(dest);
            //     linkDependencies.moduleTargets.push(State.externalDependencies[project.name][name].moduleTarget);
            // });
            
            
            /*if(unlinkDependencies && Array.isArray(unlinkDependencies.dirs) && unlinkDependencies.dirs.length > 0) {
                myPromise = myPromise.then(() => {
                    return this.unlinkDependency(project, helper, unlinkDependencies.names, unlinkDependencies.dirs);
                });
            }
            if(linkDependencies && Array.isArray(linkDependencies.dirs) && linkDependencies.dirs.length > 0) {
                myPromise = myPromise.then(() => {
                    return this.createlinkDependency(project, helper, linkDependencies.names, linkDependencies.dirs, linkDependencies.moduleTargets, linkDependencies.destDirs);
                });
            }*/

            myPromise = myPromise.then(() => {
                return this.runNpmCommand(project, helper, "dedupe", ["--preserve-symlinks", "--no-package-lock"], true);
            }).catch((err) => {
                helper.error("Erreur durant l'installation des dépendances applicatives : " + err);
                done(err);
            });

            return myPromise.then((resolve) => {
                done();
            });
        }
    }

    /**
     * Installe une dépendance app dans un répertoire spécifique (décompactage sans sous-dépendances)
     * @param npm
     * @param dependencyName
     * @param dependencyVersion
     * @param targetDir
     */
    unlinkDependency(project, helper, dependencyNames, resolvedFromDirs) {

        let p = Promise.resolve(true);
        dependencyNames.forEach((dependencyName, idx) => {
            p = p.then(()=> {
                helper.info("Suppression en lien de la dépendance " + dependencyNames[idx] + " de "+ resolvedFromDirs[idx]);
                helper.removeDir(resolvedFromDirs[idx]);
            });
        });
        
        return p;
    }

    /**
     * Installe une dépendance app dans un répertoire spécifique (décompactage sans sous-dépendances)
     * @param npm
     * @param dependencyName
     * @param dependencyVersion
     * @param targetDir
     */
    createlinkDependency(project, helper, dependencyNames, resolvedFromDirs, dependencyModuleTarget, destDirs) {

        let p = Promise.resolve(true);
        dependencyNames.forEach((dependencyName, idx) => {
            p = p.then (() => {
                if(!helper.folderExists(path.join(destDirs[idx], dependencyName))) {
                    helper.info("Creation en lien de la dépendance " + (dependencyModuleTarget[idx] || resolvedFromDirs[idx]) + " vers " + path.join(destDirs[idx], dependencyName));
                    fs.symlinkSync(dependencyModuleTarget[idx] || resolvedFromDirs[idx], path.join(destDirs[idx], dependencyName));
                }
                if(dependencyModuleTarget[idx]) {
                    if(!helper.folderExists(path.join(dependencyModuleTarget[idx], helper.NODE_MODULES))) {
                        helper.info("Creation en lien de la dépendance " + path.join(resolvedFromDirs[idx], helper.NODE_MODULES) + " vers " + path.join(dependencyModuleTarget[idx], helper.NODE_MODULES));
                        fs.symlinkSync(path.join(resolvedFromDirs[idx], helper.NODE_MODULES), path.join(dependencyModuleTarget[idx], helper.NODE_MODULES));
                    }
                    if(!helper.isSymlink(path.join(dependencyModuleTarget[idx], "package.json"))) {
                        helper.info("Creation en lien de la dépendance " + path.join(resolvedFromDirs[idx], "package.json") + " vers " + path.join(dependencyModuleTarget[idx], "package.json"));
                        fs.symlinkSync(path.join(resolvedFromDirs[idx], "package.json"), path.join(dependencyModuleTarget[idx], "package.json"));
                    }
                }

            });
        });
        
        return p;
    }
}

module.exports = DedupeNpmDependencies;