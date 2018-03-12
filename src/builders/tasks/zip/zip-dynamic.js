"use strict";

const path = require("path");
const zip = require("gulp-zip");
const State = require("./../../state");
const fs = require('fs-extra');
const npm = require("npm");
const Task = require("./../task");

class ZipDynamicTask extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.zipNameSuffixe = "-dynamic";
    }

    task(gulp, helper, conf, project) {
        let zipname = project.name + "-" + project.version;
        return (done) => {

            helper.stream(
                done,
                gulp.src(path.join(conf.buildWorkDir, project.name) + "/**/*")
                    .pipe(zip(zipname + this.zipNameSuffixe + ".zip"))
                    .pipe(gulp.dest(conf.buildWorkDir))
            );
        }
    }
}


module.exports = ZipDynamicTask;
