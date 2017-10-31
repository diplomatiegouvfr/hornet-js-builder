"use strict";

const del = require("del");
const Task = require("./../task");
const Utils = require("../utils");
const Prepare = require("./prepare");

class PrepareClean extends Prepare {

    task(gulp, helper, conf, project) {
        return (done) => {
            Utils.gulpDelete(helper, this.targetDir)(done);
        }
    }
}

module.exports = PrepareClean;