"use strict";

const Task = require("./../task");
const docker = require("../../../docker/docker-runner");
var _ = require("lodash");

class CleanDockerContainer extends Task {

    task(gulp, helper, conf, project) {
        return (done) => {
            if (!_.isUndefined(helper.getDocker())) {
                docker.down(helper.getDocker().options);
            }
            done();
        }
    }
}

module.exports = CleanDockerContainer;