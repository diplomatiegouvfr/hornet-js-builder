"use strict";

const Task = require("./../task");

class Vorpal extends Task {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            process.nextTick(() => 
                helper
                    .getVorpal()
                    .delimiter("hb$")
                    .show());
            done();
        }
    }
}

module.exports = Vorpal;