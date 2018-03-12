"use strict";

const Task = require("./../task");
const zip = require("gulp-zip");
const path = require("path");

/**
 * Fonction générique de recopie de fichiers vers le repertoire de destination
 */
class ZipEnvironment extends Task {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.zipNameSuffixe = "-environment";
    }

    task(gulp, helper, conf, project) {

        let zipname = project.name + "-" + project.version;

        return (done) => {            
            return helper.stream(done, gulp.src(conf.environment.dir + "/**/*")
                .pipe(zip(zipname + this.zipNameSuffixe + ".zip"))
                .pipe(gulp.dest(conf.buildWorkDir)));
        }
    }
}

module.exports = ZipEnvironment;
