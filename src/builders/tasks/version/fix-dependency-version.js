const State = require("../../state");
const Task = require("../task");
const Utils = require("../utils");
const FixVersion = require("./fix-version");

class FixDependencyVersion extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
        State.dependency = helper.getDependency();
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            if (!State.version) {
                helper.error("Erreur pas de version fix précisée, utiliser l'argument '--versionFix' !!");
                return done();
            }

            if (!State.dependency) {
                helper.error("Erreur pas de package précisée, utiliser l'argument '--dependencyVersionFix' !!");
                return done();
            }

            helper.debug(`FixDependencyVersion : ${project.packageJson.name}`, "@", project.packageJson.version);

            this.replaceInModules(project, helper.DEPENDENCIES, helper);
            this.replaceInModules(project, helper.DEV_DEPENDENCIES, helper);

            this.replaceInDependency(project, helper.DEPENDENCIES, helper);
            this.replaceInDependency(project, helper.DEV_DEPENDENCIES, helper);

            return helper.stream(
                done,
                gulp
                    .src(["package.json"], { base: project.dir, cwd: project.dir })
                    .pipe(Utils.packageJsonFormatter(helper, project))
                    .pipe(gulp.dest(project.dir)),
            );
        };
    }

    replaceInDependency(project, KeyDependencies, helper) {
        if (project.packageJson[KeyDependencies]) {
            Object.keys(project.packageJson[KeyDependencies]).forEach((projectName) => {
                if (projectName.startsWith(State.dependency)) {
                    const version = this.getVersion(project);
                    helper.debug(
                        `ReplaceInDependency  ${project.packageJson.name}`,
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
                    project.packageJson[KeyDependencies][projectName] = version;
                }
            });
        }
    }

    replaceInModules(project, KeyDependencies, helper) {
        if (State.moduleList && project.packageJson[KeyDependencies]) {
            Object.keys(State.moduleList).forEach((projectName) => {
                if (project.packageJson[KeyDependencies][projectName] && projectName.startsWith(State.dependency)) {
                    const version = this.getVersion(State.moduleList[projectName]);

                    helper.debug(
                        `ReplaceInModules  ${project.packageJson.name}`,
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

                    project.packageJson[KeyDependencies][projectName] = version;
                }
            });
        }
    }

    getVersion(project) {
        if (State.version.match(/^\-|\\./)) {
            return project.packageJson.version + State.version;
        }
        return State.version;
    }
}

module.exports = FixDependencyVersion;
