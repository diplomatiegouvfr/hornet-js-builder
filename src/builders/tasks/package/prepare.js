const path = require("path");
const Task = require("../task");

class Prepare extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.targetDir = path.join(".", conf.buildWorkDir, project.name);
    }
}

module.exports = Prepare;
