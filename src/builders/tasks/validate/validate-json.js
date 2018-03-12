"use strict";

const Task = require("./../task");
const jsonlint = require("gulp-jsonlint");

class ValidateJson extends Task {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, path) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.path = path;
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            var myCustomReporter = (file) => {
                log("File " + file.path + " is not valid JSON.");
            };

            helper.stream(
                done,
                gulp.src(this.path + "/*.json")
                .pipe(jsonlint())
                .pipe(jsonlint.reporter())
                .pipe(jsonlint.failAfterError())
            );
        }
    }
}


module.exports = ValidateJson;
