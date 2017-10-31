"use strict";

const Task = require("./../task");
const npm = require("npm");

class PublishTask extends Task {

    task(gulp, helper, conf, project) {
        return (done) => {
            helper.npmPublish(npm, project.dir, done);
        }
    }
}

module.exports = PublishTask;
