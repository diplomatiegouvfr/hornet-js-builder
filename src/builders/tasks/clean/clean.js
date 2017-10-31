"use strict";

const path = require("path");
const del = require("del");
const Task = require("./../task");
const Utils = require("../utils");
const State = require("../../state");

class CleanTask extends Task {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, pattern) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.pattern = pattern;
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            Utils.gulpDelete(helper, this.pattern)(done);
        }
    }
}

module.exports = CleanTask;