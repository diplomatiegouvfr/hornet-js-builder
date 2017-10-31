"use strict";

const Task = require("./../task");
const docker = require("../../../docker/docker-runner");

class PublishDockerImages extends Task {

    task(gulp, helper, conf, project) {
        return (done) => {
            docker.publish(helper.getDocker().registry, helper.getDocker().service);
            done();
        }
    }
}


module.exports = PublishDockerImages;
