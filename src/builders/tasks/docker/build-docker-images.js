"use strict";

const Task = require("./../task");
const docker = require("../../../docker/docker-runner");

class BuildDockerImages extends Task {

    task(gulp, helper, conf, project) {
        return (done) => {
                docker.build(helper.getDocker().options, helper.getDocker().service);
            done();
        }
    }
}


module.exports = BuildDockerImages;
