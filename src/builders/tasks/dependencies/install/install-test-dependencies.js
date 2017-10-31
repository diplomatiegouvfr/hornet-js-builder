"use strict";

const Task = require("../../task");
const npm = require("npm");
const fs = require("fs")

class InstallTestDependencies extends Task {

    task(gulp, helper, conf, project) {
        return (done) => {
            if (helper.detectBuildOrTestDependenciesChanges(project, helper.TEST_DEPENDENCIES, helper.NODE_MODULES_TEST)) {
                return helper.installBuildOrTestDependencies(project, npm, helper.TEST_DEPENDENCIES, helper.NODE_MODULES_TEST, done);
            } else {
                return Promise.resolve(true).then(() => {
                    done()
                });
            }
        }
    }
}

module.exports = InstallTestDependencies;