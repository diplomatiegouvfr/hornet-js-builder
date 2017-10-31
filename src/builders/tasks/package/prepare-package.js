"use strict";

const path = require("path");
const zip = require("gulp-zip");
const State = require("./../../state");
const fs = require('fs-extra');
const npm = require("npm");
const _ = require("lodash");

const Prepare = require("./prepare");

class PreparePackage extends Prepare {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.fileList = [
            path.join("./" + conf.static + "/**/*"),
            "!**/*.map",
            path.join("./index.*"),
            path.join(conf.src, "/**/*"),
            path.join("./", helper.NODE_MODULES_APP + "/**/*"),
            path.join(conf.config + "/**/*"),
            path.join("./package.json"),
            "!**/*.ts"
        ]
        if(conf.ressources && _.isArray(conf.ressources)) {
            Array.prototype.push.apply(this.fileList, conf.ressources);
        }
        
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            helper.stream(
                done,
                gulp.src(this.fileList, {base: "."})
                    .pipe(gulp.dest(this.targetDir))
            );
        }
    }
}


module.exports = PreparePackage;
