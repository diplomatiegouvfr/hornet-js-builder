const fs = require("fs");
const path = require("path");
const ModuleHelper = require("../../../module-helpers");
const State = require("../../state");
const InstallDependencies = require("./install/install-dependencies");

class DedupeNpmDependencies extends InstallDependencies {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            if (
                helper.isSkipDedupe() ||
                !State.externalDependencies ||
                !State.externalDependencies[project.name] ||
                Object.keys(State.externalDependencies[project.name]).length == 0
            ) {
                return done();
            }

            let myPromise = new Promise((resolve, reject) => {
                resolve();
            });

            myPromise = myPromise
                .then(() => {
                    return this.runNpmCommand(project, helper, "dedupe", ["--preserve-symlinks", "--no-package-lock"], true);
                })
                .catch((err) => {
                    helper.error(`Erreur durant l'installation des dépendances applicatives : ${err}`);
                    done(err);
                });

            return myPromise.then((resolve) => {
                done();
            });
        };
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
            p = p.then(() => {
                helper.info(`Suppression en lien de la dépendance ${dependencyNames[idx]} de ${resolvedFromDirs[idx]}`);
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
            p = p.then(() => {
                if (!helper.folderExists(path.join(destDirs[idx], dependencyName))) {
                    helper.info(
                        `Creation en lien de la dépendance ${dependencyModuleTarget[idx] || resolvedFromDirs[idx]} vers ${path.join(
                            destDirs[idx],
                            dependencyName,
                        )}`,
                    );
                    fs.symlinkSync(dependencyModuleTarget[idx] || resolvedFromDirs[idx], path.join(destDirs[idx], dependencyName));
                }
                if (dependencyModuleTarget[idx]) {
                    if (!helper.folderExists(path.join(dependencyModuleTarget[idx], helper.NODE_MODULES))) {
                        helper.info(
                            `Creation en lien de la dépendance ${path.join(resolvedFromDirs[idx], helper.NODE_MODULES)} vers ${path.join(
                                dependencyModuleTarget[idx],
                                helper.NODE_MODULES,
                            )}`,
                        );
                        fs.symlinkSync(path.join(resolvedFromDirs[idx], helper.NODE_MODULES), path.join(dependencyModuleTarget[idx], helper.NODE_MODULES));
                    }
                    if (!helper.isSymlink(path.join(dependencyModuleTarget[idx], "package.json"))) {
                        helper.info(
                            `Creation en lien de la dépendance ${path.join(resolvedFromDirs[idx], "package.json")} vers ${path.join(
                                dependencyModuleTarget[idx],
                                "package.json",
                            )}`,
                        );
                        fs.symlinkSync(path.join(resolvedFromDirs[idx], "package.json"), path.join(dependencyModuleTarget[idx], "package.json"));
                    }
                }
            });
        });

        return p;
    }
}

module.exports = DedupeNpmDependencies;
