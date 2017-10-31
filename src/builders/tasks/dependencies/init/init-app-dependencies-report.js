"use strict";
const npm = require("npm");

const Task = require("../../task");
const State = require("../../../state");

class InitReportDependencies extends Task {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, keyDependencies) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.keyDependencies = keyDependencies || helper.APP_DEPENDENCIES;
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            let root = project.packageJson;
            let rootStr = root.name + "@" + root.version;
            helper.getDependenciesReport(npm, root, this.keyDependencies, State.externalDependencies[project.name], (report) => {
                State.report = report;
                done();
            });
        }
    }
}

module.exports = InitReportDependencies;