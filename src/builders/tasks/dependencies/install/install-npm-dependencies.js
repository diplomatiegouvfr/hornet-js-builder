const fs = require("fs");
const path = require("path");
const State = require("../../../state");
const InstallDependencies = require("./install-dependencies");

class InstallNpmDependencies extends InstallDependencies {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, islink, installDeps, installDevDeps, installCi, tasksDependenciesLink) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
        this.islink = islink;
        this.installDeps = installDeps;
        this.installDevDeps = installDevDeps;
        this.installCi = installCi;
        this.tasksDependenciesLink = tasksDependenciesLink;
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            const root = project.packageJson;
            const toLink = {};
            const toInstall = {};
            const hasExternal = State.externalDependencies[project.name] && Object.keys(State.externalDependencies[project.name]).length > 0;

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
                }
                helper.warn("'Fin si déjà exécuté' demandée mais dépandance(s) non installée(s) trouvée(s) :", Object.keys(toInstall));
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

            let myPromise = new Promise((resolve, reject) => {
                resolve();
            });

            let idx = 0;
            const nDeps = Object.keys(toInstall).length;
            let idxLink = 0;
            const nDepsLink = Object.keys(toLink).length;

            if (this.islink && !this.installCi) {
                const linkDependencies = { dirs: [], names: [], moduleTarget: [] };
                helper.each(toLink, (version, name) => {
                    linkDependencies.dirs.push(State.externalDependencies[project.name][name].dir);
                    linkDependencies.names.push(name);
                    linkDependencies.moduleTarget.push(State.externalDependencies[project.name][name].moduleTarget);
                    helper.info(`Ajout installation en lien symbolique de la dépendance ${++idxLink}/${nDepsLink} : '${name}@${version}'`);

                    if (helper.folderExists(path.join(project.dir, helper.NODE_MODULES, name))) {
                        helper.removeDir(path.join(project.dir, helper.NODE_MODULES, name));
                    }
                });

                if (Array.isArray(linkDependencies.dirs) && linkDependencies.dirs.length > 0) {
                    helper.info("Installation en lien symbolique des dépendances");
                    myPromise = this.createlinkDependency(project, helper, linkDependencies.names, linkDependencies.dirs, linkDependencies.moduleTarget, gulp);
                }
            } else {
                const dependencies = [];
                helper.each(toInstall, (version, name) => {
                    helper.info(`Ajout installation de la dépendance ${++idx}/${nDeps} : '${name}@${version}'`);
                    dependencies.push(`${name}@${toInstall[name]}`);
                });
                myPromise = this.installDependencyCmd(project, hasExternal ? dependencies : [], helper, this.installCi ? "ci" : "install");
            }
            myPromise.catch((err) => {
                helper.error(`Erreur durant l'installation des dépendances applicatives : ${err}`);
                // process.exit(-1);
                done(err);
            });

            return myPromise.then((resolve) => {
                done();
            });
        };
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
            return this.runNpmCommand(npm, "install", dependencies);
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

        const args = [command || "install"];

        if (this.installDevDeps) {
            args.push("--only=dev");
        }
        if (!this.installDevDeps) {
            args.push("--only=prod");
        }
        if (helper.isOfflineMode()) {
            args.push("--offline");
        }
        if (helper.getRemainingArgs()) {
            args.push(helper.getRemainingArgs());
        }
        return InstallDependencies.installDependencyCmd(project, helper, args, dependencies, project.dir).catch((err) => {
            helper.warn(`Erreur durant l'installation de la dépendance : ${project.name}, ERROR: ${err}`);
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
    createlinkDependency(project, helper, dependencyNames, resolvedFromDirs, dependencyModuleTarget, gulp) {
        let p = Promise.resolve(true);
        dependencyNames.forEach((dependencyName, idx) => {
            p = p
                .then(() => {
                    return path.join(project.dir, helper.NODE_MODULES, dependencyName);
                })
                .then((noTargetDir) => {
                    return new Promise((resolve, reject) => {
                        if (dependencyModuleTarget[idx] && !helper.folderExists(dependencyModuleTarget[idx])) {
                            if (this.tasksDependenciesLink) {
                                helper.info(`Installation en lien de la dépendance ${dependencyName} le répertoire outDir (tsconfig) n'existe pas encore ${dependencyModuleTarget[idx]}`);
                                const tasks = this.tasksDependenciesLink.map((task) => `${task}/${dependencyName}`);
                                helper.info(`lancement des taches ${tasks}`);
                                gulp.series(...tasks)((err) => {
                                    if (err) {
                                        reject(err);
                                    } else {
                                        resolve(noTargetDir);
                                    }
                                });
                            } else {
                                helper.warn(`Pas d'installation en lien de la dépendance ${dependencyName} le répertoire outDir (tsconfig) n'existe pas ${dependencyModuleTarget[idx]}`);
                            }
                        } else {
                            resolve(noTargetDir);
                        }
                    });
                })
                .then((noTargetDir) => {
                    helper.info(`Installation en lien de la dépendance ${dependencyModuleTarget[idx] || resolvedFromDirs[idx]} vers ${path.join(project.dir, helper.NODE_MODULES, dependencyName)}`);
                    if (dependencyModuleTarget[idx]) {
                        if (helper.folderExists(path.join(dependencyModuleTarget[idx], helper.NODE_MODULES))) {
                            helper.removeDir(path.join(dependencyModuleTarget[idx], helper.NODE_MODULES));
                        }
                    }

                    if (!helper.folderExists(noTargetDir)) {
                        fs.mkdirSync(noTargetDir);
                    }

                    fs.readdirSync(dependencyModuleTarget[idx] || resolvedFromDirs[idx]).forEach((name) => {
                        if (name) {
                            helper.debug(`Creation du lien ${path.join(dependencyModuleTarget[idx] || resolvedFromDirs[idx], name)} vers ${path.join(noTargetDir, name)}`);
                            fs.symlinkSync(path.join(dependencyModuleTarget[idx] || resolvedFromDirs[idx], name), path.join(noTargetDir, name));
                        }
                    });

                    if (dependencyModuleTarget[idx]) {
                        if (!helper.folderExists(path.join(dependencyModuleTarget[idx], helper.NODE_MODULES))) {
                            helper.info(`Copy des node_modules ${path.join(resolvedFromDirs[idx], helper.NODE_MODULES)} vers ${path.join(noTargetDir, helper.NODE_MODULES)}`);
                            helper.copyDir(path.join(resolvedFromDirs[idx], helper.NODE_MODULES), path.join(noTargetDir, helper.NODE_MODULES));
                        }
                        if (!helper.fileExists(path.join(noTargetDir, "package.json"))) {
                            helper.info(`Creation du lien ${path.join(resolvedFromDirs[idx], "package.json")} vers ${path.join(noTargetDir, "package.json")}`);
                            fs.symlinkSync(path.join(resolvedFromDirs[idx], "package.json"), path.join(noTargetDir, "package.json"));
                        }
                    }
                })
                .catch((e) => helper.info(e));
        });

        return p;
    }
}

module.exports = InstallNpmDependencies;
