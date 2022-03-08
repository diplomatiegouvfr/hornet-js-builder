const path = require("path");
const Task = require("../task");

class ListChildModules extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, lModules) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
        this.lModules = lModules;
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            helper.log(this.lModules.map((module) => module.name).join(","));
            done();
        };
    }
}
module.exports = ListChildModules;
