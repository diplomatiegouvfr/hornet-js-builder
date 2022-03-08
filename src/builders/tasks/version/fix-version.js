const commander = require("../../../gulp/commander");
const State = require("../../state");
const Task = require("../task");
const Utils = require("../utils");

class FixVersion extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        if (!State.version) {
            const timestamp = new Date();
            if (helper.getVersion()) {
                State.version =
                    helper.getVersion() != "auto"
                        ? helper.getVersion()
                        : `-${timestamp.getFullYear()}${
                              timestamp.getMonth() + 1
                          }${timestamp.getDay()}${timestamp.getHours()}${timestamp.getMinutes()}${timestamp.getSeconds()}`;
            }
        }
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            const version = helper.getVersion();
            if (version && version.toUpperCase() === "RC") {
                let args = ["show"];
                if (helper.getPublishRegistry()) {
                    args = args.concat(["--registry", helper.getPublishRegistry()]);
                }
                args.push("--json");
                args.push(project.name);
                args.push("versions");

                return commander
                    .toPromise({ cmd: "npm", args, cwd: project.dir }, true)
                    .then((data) => {
                        let newVersion = "-RC1";
                        let oldLastVersion = 0;
                        if (data) {
                            let npmReturn = JSON.parse(data);
                            if (!npmReturn.error) {
                                if (!Array.isArray(npmReturn)) {
                                    npmReturn = [npmReturn];
                                }
                                npmReturn.forEach((ver) => {
                                    const variables = ver.match(new RegExp(`${project.version}-RC(\\w+)$`));

                                    if (variables && variables.length > 0 && oldLastVersion < Number.parseInt(variables[1])) {
                                        oldLastVersion = variables[1];
                                    }
                                });
                                newVersion = `-RC${1 + Number.parseInt(oldLastVersion)}`;
                            } else {
                                helper.warn(` NPM VIEW error: ${npmReturn.error.summary}`);
                            }
                        }
                        State.version = newVersion;

                        this.replaceInModules(project, helper.DEPENDENCIES, helper, project.packageJson.version);
                        this.replaceInModules(project, helper.DEV_DEPENDENCIES, helper, project.packageJson.version);

                        project.packageJson.version = this.getVersion(project);
                        project.version = project.packageJson.version;

                        helper.info(`Version fixée: ${project.packageJson.name}@${project.packageJson.version}`);

                        return helper.stream(
                            done,
                            gulp.src(["package.json"], { cwd: project.dir }).pipe(Utils.packageJsonFormatter(helper, project)).pipe(gulp.dest(project.dir)),
                        );
                    })
                    .catch((err) => {
                        helper.error(`La commande npm ${args} dans ${helper.getMainProcessDir()} est ko`);
                        done(err);
                    });
            }

            if (!State.version) {
                helper.error("Erreur pas de version fix précisée, utiliser l'argument '--versionFix' !!");
                return done();
            }

            this.replaceInModules(project, helper.DEPENDENCIES, helper);
            this.replaceInModules(project, helper.DEV_DEPENDENCIES, helper);

            project.packageJson.version = this.getVersion(project);
            project.version = project.packageJson.version;

            helper.info(`Version fixée: ${project.packageJson.name}@${project.packageJson.version}`);

            return helper.stream(
                done,
                gulp.src(["package.json"], { cwd: project.dir }).pipe(Utils.packageJsonFormatter(helper, project)).pipe(gulp.dest(project.dir)),
            );
        };
    }

    replaceInModules(project, KeyDependencies, helper, versionToFix) {
        if (State.moduleList && project.packageJson[KeyDependencies]) {
            Object.keys(State.moduleList).forEach((projectName) => {
                if (project.packageJson[KeyDependencies][projectName]) {
                    const version = this.getVersion(State.moduleList[projectName]);

                    helper.info(
                        `ReplaceInModules ${project.packageJson.name}`,
                        "@",
                        project.packageJson.version,
                        ", KeyDependencies : ",
                        KeyDependencies,
                        ", projectName : ",
                        projectName,
                        ", version : ",
                        project.packageJson[KeyDependencies][projectName],
                        "=>",
                        version,
                    );

                    project.packageJson[KeyDependencies][projectName] = this.getVersion(State.moduleList[projectName]);
                }
            });
        }
    }

    getVersion(currentProject) {
        if (currentProject.versionFix) {
            return currentProject.packageJson.version;
        }
        if (State.version && State.version.match(/^\-|\\./) && !currentProject.packageJson.version.includes("RC")) {
            return currentProject.packageJson.version + State.version;
        }
        if (State.version && currentProject.packageJson.version.includes("RC")) {
            return currentProject.packageJson.version.split("-RC")[0] + State.version;
        }
        return State.version;
    }
}

module.exports = FixVersion;
