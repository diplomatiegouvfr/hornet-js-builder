"use strict";

const Task = require("../task");
const path = require("path");

class Prepare extends Task {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.targetDir = path.join(".", conf.buildWorkDir, project.name)
        
    }
}

module.exports = Prepare;