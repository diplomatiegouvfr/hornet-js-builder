"use strict";

const Task = require("./../task");
const path = require("path");
const fs = require("fs");

const replace = require('gulp-replace');

class FindUnusedTemplateVar extends Task {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
    }

    task(gulp, helper, conf, project) {

        return (done) => {
            let err;
            return helper.stream(() => {done(err)}, gulp.src(path.join(conf.buildWorkDir, conf.testEnvironment.templates) + "/**/*.json")
                .pipe(replace(/#{(.*)/g, (match, p1, offset, string) => {
                    helper.error("Template variable unused " + match);
                    helper.debug("Inside of " + string);
                    err = "Template variable unused " + match
                    return match;
                  }))
                );
        }
    }
}


module.exports = FindUnusedTemplateVar;
