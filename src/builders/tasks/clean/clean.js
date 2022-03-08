const { utils } = require("mocha");
const Task = require("../task");
const Utils = require("../utils");

class CleanTask extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, pattern) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.pattern = pattern;
    }

    task(gulp, helper, conf, project) {
        helper.debug("clean pattern : ", this.pattern);
        return (done) => {
            Utils.gulpDelete(helper, this.pattern, project.dir)(done);
        };
    }
}

module.exports = CleanTask;
