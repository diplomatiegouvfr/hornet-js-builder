"use strict";

const Task = require("../task");

class Prepare extends Task {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.targetDir = "./target/" + project.name
        
    }
}

module.exports = Prepare;