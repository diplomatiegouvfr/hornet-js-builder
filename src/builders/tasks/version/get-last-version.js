const commander = require("../../../gulp/commander");
const State = require("../../state");
const Task = require("../task");

class GetLastVersion extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
    }

    getlastVersionSnapshot(packageJson, module) {
        let snapshotVersion;
        packageJson &&
            Object.keys(packageJson)
                .filter((key) => ["dependencies", "devDependencies"].includes(key))
                .forEach((key) => {
                    if (packageJson[key] && !snapshotVersion) {
                        snapshotVersion = packageJson[key][module];
                    }
                });
        return snapshotVersion;
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            const moduleName = helper.getModule() || project.name;
            helper.info("Récupération de la version pour le module : ", moduleName);
            helper.debug;

            const args = ["view"];
            args.push("--json");
            args.push(moduleName);
            args.push("time");

            return commander.toPromise({ cmd: "npm", args, cwd: helper.getMainProcessDir() }, true, undefined, true).then((ret) => {
                if (!ret) {
                    helper.info("Pas de version trouvé pour le module : ", moduleName);
                    return;
                }
                let versions = JSON.parse(ret);

                if (helper.getVersion() && helper.getVersion() != "auto") {
                    let snapshotVersion;
                    if (helper.getVersion() === "snapshot") {
                        if (State.moduleList) {
                            // multi-module
                            Object.keys(State.moduleList).forEach((projectName) => {
                                if (!snapshotVersion) {
                                    snapshotVersion = this.getlastVersionSnapshot(State.moduleList[projectName].packageJson, moduleName);
                                }
                            });
                        } else {
                            snapshotVersion = this.getlastVersionSnapshot(project.packageJson, moduleName);
                        }
                    }
                    const versionFound = Object.keys(versions).find((version) => version === snapshotVersion || version === helper.getVersion());
                    const newVersions = {};
                    if (versionFound) {
                        newVersions[versionFound] = versions[versionFound];
                        versions = newVersions;
                    }
                }
                if (versions) {
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
                        helper.info("Last Version:", lastVersion);
                        State.version = lastVersion;
                        State.result = lastVersion;
                        done();
                    } else {
                        done(new Error("impossible de récupérer la dernière version"));
                    }
                } else {
                    done(new Error("la commande npm n'a retourné aucune resultat"));
                }
            });
        };
    }
}

module.exports = GetLastVersion;
