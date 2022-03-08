const semver = require("semver");
const commander = require("../../../gulp/commander");
const Helper = require("../../../helpers");
const Task = require("../task");
const Utils = require("../utils");

class FixDependenciesVersion extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            const moduleName = helper.getModule();
            helper.info("Récupération de la version pour le(s) module(s) : ", moduleName);

            if (!moduleName) {
                helper.info("Pas de module de renseigné.");
                return;
            }

            helper.info(`Remplacement pour le projet ${project.packageJson.name}@${project.packageJson.version} des versions des dépendances.`);

            const DEPENDENCIES_KEYS = [helper.DEPENDENCIES, helper.DEV_DEPENDENCIES];
            const regExpModule = new RegExp(moduleName);

            const dependencies = {};

            DEPENDENCIES_KEYS.forEach((KeyDependencies) => {
                Object.keys(project.packageJson[KeyDependencies]).forEach((dependency) => {
                    if (regExpModule.test(dependency)) {
                        if (semver.valid(project.packageJson[KeyDependencies][dependency])) {
                            dependencies[dependency] = project.packageJson[KeyDependencies][dependency];
                        }
                    }
                });
            });

            // const p = Promise.resolve((resolve) => {});

            const actions = Object.keys(dependencies).map(getVersions);
            const results = Promise.all(actions); // pass array of promises

            results.then((dependenciesVersions) => {
                DEPENDENCIES_KEYS.forEach((KeyDependencies) => {
                    dependenciesVersions.forEach((dependencyVersions) => {
                        Object.keys(dependencyVersions).forEach((dependency) => {
                            if (project.packageJson[KeyDependencies][dependency]) {
                                if (
                                    project.packageJson[KeyDependencies][dependency] ===
                                    dependencyVersions[dependency][dependencyVersions[dependency].length - 1]
                                ) {
                                    helper.info(
                                        ` ===> ${KeyDependencies}/${dependency} déjà en version ${
                                            dependencyVersions[dependency][dependencyVersions[dependency].length - 1]
                                        } `,
                                    );
                                } else {
                                    helper.info(
                                        ` => remplacement dans ${KeyDependencies}/${dependency} de la version ${
                                            project.packageJson[KeyDependencies][dependency]
                                        } en ${dependencyVersions[dependency][dependencyVersions[dependency].length - 1]} `,
                                    );
                                    project.packageJson[KeyDependencies][dependency] =
                                        dependencyVersions[dependency][dependencyVersions[dependency].length - 1];
                                }
                            }
                        });
                    });
                });

                return helper.stream(done, gulp.src(["package.json"]).pipe(Utils.packageJsonFormatter(helper, project)).pipe(gulp.dest(".")));
            });

            return results;
        };
    }
}

const getVersions = (dependencyName) => {
    return new Promise((resolve) => {
        return commander
            .toPromise({ cmd: "npm", args: ["view", "--json", dependencyName, "time"], cwd: Helper.getMainProcessDir() }, true, undefined, true)
            .then((ret) => {
                const dependencyVersions = {};
                if (!ret) {
                    Helper.info("Pas de version trouvé pour le module : ", dependencyName);
                    return;
                }

                const versions = JSON.parse(ret);

                if (versions && Helper.getVersion() && Helper.getVersion() !== "auto") {
                    const regExpVersion = new RegExp(Helper.getVersion());

                    const versionsFound = Object.keys(versions)
                        .filter((version) => semver.valid(version) && regExpVersion.test(version))
                        .sort((a, b) => (semver.gt(a, b) ? 1 : semver.eq(a, b) ? 0 : -1));
                    Helper.debug(`Versions trouvées pour ${dependencyName} :`, versionsFound);
                    // dependenciesVersions[dependencyName] = versionsFound;
                    dependencyVersions[dependencyName] = versionsFound;
                    resolve(dependencyVersions);
                } else if (versions && Helper.getVersion() === "auto") {
                    Helper.debug("Mode auto activé, c'est la date de publication qui est utilisée.");

                    const sortedValue = Object.values(versions).sort((value1, value2) => Date.parse(value2) - Date.parse(value1));
                    let found = false;
                    let i = 0;
                    let lastVersion;

                    while (!found && i < sortedValue.length) {
                        const lastVersionEntry = Object.entries(versions).filter((version) => version[1] === sortedValue[i]);

                        if (lastVersionEntry[0] && lastVersionEntry[0][0] && /\d/.test(lastVersionEntry[0][0])) {
                            found = true;
                            lastVersion = lastVersionEntry[0][0];
                        }
                        i += 1;
                    }
                    if (lastVersion) {
                        Helper.debug(`Versions trouvées en mode auto pour ${dependencyName} :`, o);
                        // dependenciesVersions[dependencyName] = [lastVersion];
                        dependencyVersions[dependencyName] = [lastVersion];
                        resolve(dependencyVersions);
                    }
                }
            });
    });
};

module.exports = FixDependenciesVersion;
