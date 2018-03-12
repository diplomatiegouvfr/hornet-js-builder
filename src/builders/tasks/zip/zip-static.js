"use strict";

const path = require("path");
const zip = require("gulp-zip");
const State = require("./../../state");
const fs = require('fs-extra');
const npm = require("npm");
const Task = require("./../task");

class ZipStaticTask extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.zipNameSuffixe = "-static";
    }

    task(gulp, helper, conf, project) {
        
        let zipname = project.name + "-" + project.version;
        
        return (done) => {

            return helper.stream(
                done,
                gulp.src(path.join(conf.buildWorkDir, project.name, conf.static) + "/**/*", {base: path.join(conf.buildWorkDir, project.name) })
                    .pipe(zip(zipname + this.zipNameSuffixe + ".zip"))
                    .pipe(gulp.dest(conf.buildWorkDir))
            );
        }
    }
}


module.exports = ZipStaticTask;
