"use strict";

const State = require("../../state");
const Utils = require("../utils");

const Task = require("../task");

class FixVersion extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        if (!State.version) {
            let timestamp = new Date();
            if (helper.getVersion()) {
                State.version = helper.getVersion() != "auto" ? helper.getVersion() : ("-" + timestamp.getFullYear() + (timestamp.getMonth() + 1) + timestamp.getDay() + timestamp.getHours() + timestamp.getMinutes() + timestamp.getSeconds());
                console.log("State.version " + State.version);
            }
        }
    }

    task(gulp, helper, conf, project) {
        return (done) => {

            if(!State.version) {
                return done();
            }
            
            helper.debug("modification de la version en : " + project.packageJson.version);

            this.replaceInDependencies(project, helper.APP_DEPENDENCIES);
            this.replaceInDependencies(project, helper.TEST_DEPENDENCIES);
            this.replaceInDependencies(project, helper.BUILD_DEPENDENCIES);
            this.replaceInDependencies(project, helper.TS_DEFINITIONS_DEPENDENCIES);

            project.packageJson.version = this.getVersion(project);
            project.version = project.packageJson.version;

            return helper.stream(
                done,
                gulp.src(["package.json"])
                    .pipe(Utils.packageJsonFormatter(helper, project))
                    .pipe(gulp.dest("."))
            );

        }
    }

    replaceInDependencies(project, KeyDependencies) {
        if (State.moduleList && project.packageJson[KeyDependencies]) {
            Object.keys(State.moduleList).forEach(projectName =>  {
                if (project.packageJson[KeyDependencies][projectName]) {
                    project.packageJson[KeyDependencies][projectName] = this.getVersion(State.moduleList[projectName]);
                }
            });
        }
    }

    getVersion(currentProject) {
        if (currentProject.versionFix) {
            return currentProject.packageJson.version;
        } else if (State.version.match(/^\-|\\./) ) {
            return currentProject.packageJson.version + State.version;
        } else {
            return State.version;
        }
    }
}


module.exports = FixVersion;