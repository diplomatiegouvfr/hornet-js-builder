"use strict";

const Task = require("./../task");
const Utils = require("../utils");
const npm = require("npm");
const zip = require("gulp-zip");
const path = require("path");

/**
 * Fonction générique de recopie de fichiers vers le repertoire de destination
 */
class PrepareTemplate extends Task {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.envDir = (project.builderJs.depaut && project.builderJs.depaut.envDir) || "./environment";

        this.fileList = [
            path.join(this.envDir, "configuration/**/*"),
            path.join(this.envDir, "templates/**/*")
        ];

        this.zipname = project.name + "-" + project.version + "-environment";
    }

    task(gulp, helper, conf, project) {

        return (done) => {
            if (!helper.folderExists(this.envDir)) {
                return done();
            }

            return helper.stream(done, gulp.src(this.fileList, {base: "./environment"})
                .pipe(zip(this.zipname + ".zip"))
                .pipe(gulp.dest("./target/")));
        }
    }
}

module.exports = PrepareTemplate;
