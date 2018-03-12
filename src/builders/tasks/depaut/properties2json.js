"use strict";

const Task = require("./../task");
const path = require("path");

const props2json = require("gulp-props2json");

class Properties2Json  extends Task {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
    }

    task(gulp, helper, conf, project) {

        return (done) => {
            helper.stream(done, gulp.src(conf.environment.configuration + "/*.properties")
                .pipe(props2json())
                .pipe(gulp.dest(path.join(conf.buildWorkDir, conf.testEnvironment.configuration))));
        }
    }
}


module.exports = Properties2Json;
