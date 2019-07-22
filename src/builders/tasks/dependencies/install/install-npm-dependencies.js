"use strict";

const InstallDependencies = require("./install-dependencies");
const State = require("../../../state");
const fs = require("fs");
const path = require("path");
const commander = require("../../../../gulp/commander");
const semver = require("semver");

class InstallNpmDependencies extends InstallDependencies {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, islink, installDeps, installDevDeps, installCi) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
        this.islink = islink;
        this.installDeps = installDeps;
        this.installDevDeps = installDevDeps;
        this.installCi = installCi;
    }

    task(gulp, helper, conf, project) {
        return (done) => {

            var root = project.packageJson;
            var toLink = {}, toInstall = {};
            let hasExternal = State.externalDependencies[project.name] && Object.keys(State.externalDependencies[project.name]).length > 0;

            // on créé les répertoires si besoin
            if (!helper.folderExists(path.join(project.dir, helper.NODE_MODULES))) {
                fs.mkdirSync(path.join(project.dir, helper.NODE_MODULES));
            }


            if (helper.isForce() && fs.exists(path.join(project.dir, "package-lock.json"))) {
                fs.unlinkSync(path.join(project.dir, "package-lock.json"));
            }

            if (this.installDevDeps && !this.installCi) {

                helper.each(root[helper.DEV_DEPENDENCIES], (version, name) => {
                    if (!State.externalDependencies[project.name][name]) {
                        toInstall[name] = version;
                    }
                });

                helper.each(root[helper.DEV_DEPENDENCIES], (version, name) => {
                    if (State.externalDependencies[project.name][name]) {
                        toLink[name] = version;
                    }
                });
            }

            if (super.passIfAlreadyExec(done, project)) {
                if (Object.keys(toInstall).length == 0) {
                    return done();
                } else {
                    helper.warn("'Fin si déjà exécuté' demandée mais dépandance(s) non installée(s) trouvée(s) :", Object.keys(toInstall));
                }
            }

            if (this.installDeps && !this.installCi) {

                helper.each(root[helper.DEPENDENCIES], (version, name) => {
                    if (!State.externalDependencies[project.name][name]) {
                        toInstall[name] = version;
                    }
                });

                helper.each(root[helper.DEPENDENCIES], (version, name) => {
                    if (State.externalDependencies[project.name][name]) {
                        toLink[name] = version;
                    }
                });
            }

            var myPromise = new Promise((resolve, reject) => { resolve(); });

            var idx = 0, nDeps = Object.keys(toInstall).length;
            var idxLink = 0, nDepsLink = Object.keys(toLink).length;

            if (this.islink && !this.installCi) {
                let linkDependencies = { dirs: [], names: [], moduleTarget: [] };
                helper.each(toLink, (version, name) => {
                    linkDependencies.dirs.push(State.externalDependencies[project.name][name].dir);
                    linkDependencies.names.push(name);
                    linkDependencies.moduleTarget.push(State.externalDependencies[project.name][name].moduleTarget);
                    helper.info("Ajout installation en lien de la dépendance " + (++idxLink) + "/" + nDepsLink + " : '" + name + "@" + version + "'");

                    if (helper.folderExists(path.join(project.dir, helper.NODE_MODULES, name))) {
                        helper.removeDir(path.join(project.dir, helper.NODE_MODULES, name));
                    }

                });

                if (Array.isArray(linkDependencies.dirs) && linkDependencies.dirs.length > 0) {
                    helper.info("Installation en lien des dépendances");
                    myPromise = this.createlinkDependency(project, helper, linkDependencies.names, linkDependencies.dirs, linkDependencies.moduleTarget);

                }
            } else {

                let dependencies = [];
                helper.each(toInstall, (version, name) => {
                    helper.info("Ajout installation de la dépendance " + (++idx) + "/" + nDeps + " : '" + name + "@" + version + "'");
                    dependencies.push(name + "@" + toInstall[name]);
                });
                myPromise = this.installDependencyCmd(project, hasExternal ? dependencies : [], helper, this.installCi ? "ci" : undefined);
            }
            myPromise.catch((err) => {
                helper.error("Erreur durant l'installation des dépendances applicatives : " + err);
                //process.exit(-1);
                done(err);
            });

            return myPromise.then((resolve) => {
                done();

            });
        }
    }

    /**
     * Installe des dépendances avec npm install
     * @param npm
     * @param dependencyName
     * @param dependencyVersion
     * @param targetDir
     */
    installAllDependency(project, npm, dependencies, helper) {
        return new Promise((resolve, reject) => {
            return this.runNpmCommand(npm, "install", dependencies)
        });
    }

    /**
     * Installe une dépendance app dans un répertoire spécifique (décompactage sans sous-dépendances)
     * @param npm
     * @param dependencyName
     * @param dependencyVersion
     * @param targetDir
     */
    installDependencyCmd(project, dependencies, helper, command) {
        helper.info("Lancement installation des dépendances de", project.name);

        return new Promise((resolve, reject) => {
            let args = [command || "install"];

            if (this.installDevDeps) {
                args.push("--only=dev")
            }
            if (!this.installDevDeps) {
                args.push("--only=prod")
            }
            if (helper.isOfflineMode()) {
                args.push("--offline")
            }
            if (helper.getRemainingArgs()) {
                args.push(helper.getRemainingArgs())
            }
            commander.toPromise({ cmd: "npm", args: args.concat(dependencies), cwd: project.dir }, true).then(() => {
                return resolve();
            }).catch((err) => {
                helper.warn("Erreur durant l'installation de la dépendance : " + project.name + ", ERROR: " + err);
            });

        });
    }

    /**
     * Installe une dépendance app dans un répertoire spécifique (décompactage sans sous-dépendances)
     * @param npm
     * @param dependencyName
     * @param dependencyVersion
     * @param targetDir
     */
    linkDependencyCmd(project, helper, dependencyNames, resolvedFromDirs) {

        helper.info("Lancement installation des dépendances en lien :", dependencyNames);

        return new Promise((resolve, reject) => {
            return commander.toPromise({ cmd: "npm", args: ["link"].concat(resolvedFromDirs), cwd: project.dir }).then(() => {
                return commander.toPromise({ cmd: "npm", args: ["link"].concat(dependencyNames), cwd: project.dir }).then(() => {
                    return resolve();
                }).catch((err) => {
                    helper.warn("Erreur durant l'installation en lien de la dépendance : " + project.name + " / " + dependencyNames + ", ERROR: " + err);
                });
            }).catch((err) => {
                helper.warn("Erreur durant l'installation en lien global de la dépendance : " + project.name + " / " + resolvedFromDirs + ", ERROR: " + err);
            });

        });

    }

    /**
     * Installe des dépendances avec npm link
     * @param npm
     * @param dependencyName
     * @param dependencyVersion
     * @param targetDir
     */
    linkDependency(project, npm, dependencyNames, resolvedFromDirs) {

        return new Promise((resolve, reject) => {
            return this.runNpmCommand(npm, "link", resolvedFromDirs).then(() => {
                return this.runNpmCommand(npm, "link", dependencyNames);
            });
        });
    }

    /**
     * Installe une dépendance app dans un répertoire spécifique (décompactage sans sous-dépendances)
     * @param npm
     * @param dependencyName
     * @param dependencyVersion
     * @param targetDir
     */
    createlinkDependency(project, helper, dependencyNames, resolvedFromDirs, dependencyModuleTarget) {
        let p = Promise.resolve(true);
        dependencyNames.forEach((dependencyName, idx) => {

            p = p.then(() => {
                let noTargetDir = path.join(project.dir, helper.NODE_MODULES, dependencyName);
                /*if(helper.folderExists(noTargetDir) || helper.isSymlink(noTargetDir)) {
                    helper.info("Suppression en lien de la dépendance " + noTargetDir);
                    helper.removeDir(noTargetDir);
                }*/
                return noTargetDir;

            }).then((noTargetDir) => {

                if (dependencyModuleTarget[idx]) {
                    if (!helper.folderExists(dependencyModuleTarget[idx])) {
                        helper.warn("Pas d'installation en lien de la dépendance " + dependencyName + " le répertoire outDir (tsconfig) n'existe pas encore " + dependencyModuleTarget[idx]);
                        return;
                    }
                }

                helper.info("Installation en lien de la dépendance " + (dependencyModuleTarget[idx] || resolvedFromDirs[idx]) + " vers " + path.join(project.dir, helper.NODE_MODULES, dependencyName));
                //fs.symlinkSync(dependencyModuleTarget[idx] || resolvedFromDirs[idx], path.join(project.dir, helper.NODE_MODULES, dependencyName));

                if (!helper.folderExists(noTargetDir)) {
                    fs.mkdirSync(noTargetDir);
                }
                //fx.copy(dependencyModuleTarget[idx] || resolvedFromDirs[idx], noTargetDir);

                fs.readdirSync(dependencyModuleTarget[idx] || resolvedFromDirs[idx]).forEach((name) => {
                    if (name) {
                        helper.debug("Creation du lien " + path.join((dependencyModuleTarget[idx] || resolvedFromDirs[idx]), name) + " vers " + path.join(noTargetDir, name));
                        fs.symlinkSync(path.join((dependencyModuleTarget[idx] || resolvedFromDirs[idx]), name), path.join(noTargetDir, name));
                    }
                });

                if (dependencyModuleTarget[idx]) {
                    if (!helper.folderExists(path.join(dependencyModuleTarget[idx], helper.NODE_MODULES))) {
                        //helper.info("Creation en lien de la dépendance " + path.join(resolvedFromDirs[idx], helper.NODE_MODULES) + " vers " + path.join(noTargetDir, helper.NODE_MODULES));
                        //fs.symlinkSync(path.join(resolvedFromDirs[idx], helper.NODE_MODULES), path.join(dependencyModuleTarget[idx], helper.NODE_MODULES));
                        helper.info("Copy des node_modules " + path.join(resolvedFromDirs[idx], helper.NODE_MODULES) + " vers " + path.join(noTargetDir, helper.NODE_MODULES));
                        //fx.copy(path.join(resolvedFromDirs[idx], helper.NODE_MODULES), path.join(noTargetDir, helper.NODE_MODULES));

                        helper.copyDir(path.join(resolvedFromDirs[idx], helper.NODE_MODULES), path.join(noTargetDir, helper.NODE_MODULES));
                        /*fx.copy(path.join(resolvedFromDirs[idx], helper.NODE_MODULES), path.join(noTargetDir, helper.NODE_MODULES), err => {
                            if (err) return console.error(err)
                          
                            helper.info('success!')
                        }) */
                    }
                    if (!helper.fileExists(path.join(noTargetDir, "package.json"))) {
                        helper.info("Creation du lien " + path.join(resolvedFromDirs[idx], "package.json") + " vers " + path.join(noTargetDir, "package.json"));
                        fs.symlinkSync(path.join(resolvedFromDirs[idx], "package.json"), path.join(noTargetDir, "package.json"));
                    }

                }
                }).then(() => {
               /*if (!helper.isSkipDedupe()) {
                    const dedupePromise = this.runNpmCommand(project, helper, "dedupe", ["--preserve-symlinks", "--no-package-lock"], true);
                    return dedupePromise.then((resolve) => {
                        helper.warn("Le dedupe s'est normalement passé");
                    }).catch((err) => {
                        helper.error("Erreur durant l'installation des dépendances applicatives : " + err);
                    });
                }*/
                return new Promise((resolve, reject) => { resolve(); });

            }).catch(e => helper.info(e));
        });

        return p;
    }
}

module.exports = InstallNpmDependencies;