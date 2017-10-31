"use strict";

const path = require("path");
const zip = require("gulp-zip");
const State = require("./../../state");
const fs = require('fs-extra');
const npm = require("npm");
const Zip = require("./zip");

class ZipDynamicTask extends Zip {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        //this.fileList.push(path.join("./" + conf.static + "/js/*.map"));
        this.zipNameSuffixe = "-dynamic";
    }

    task(gulp, helper, conf, project) {
        let zipname = project.name + "-" + project.version;
        return (cb) => {

            helper.stream(
                cb,
                gulp.src("./target/" + project.name + "/**/*", {base: "./target/" + project.name})
                    .pipe(zip(zipname + this.zipNameSuffixe + ".zip"))
                    .pipe(gulp.dest("./target"))
            );
        }
    }
}


module.exports = ZipDynamicTask;
