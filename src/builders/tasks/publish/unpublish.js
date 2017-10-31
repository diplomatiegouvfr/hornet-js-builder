"use strict";

const Task = require("./../task");
const npm = require("npm");

class UnPublishTask extends Task {

    task(gulp, helper, conf, project) {
        return (done) => {
            helper.npmUnpublish(npm, project.name, project.version, done);
        }
    }
}

module.exports = UnPublishTask;
