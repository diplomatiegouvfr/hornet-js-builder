"use strict";

const Task = require("./../task");
const istanbul = require("gulp-istanbul");

class InstrumentSourcesTest extends Task {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
    }

    task(gulp, helper, conf, project) {
        return (done) => {

            if (helper.isSkipTests()) {
                helper.info("Exécution des tests annulée car l'option '--skipTests' a été utilisée");
                return done();
            }

            helper.stream(
                done,
                gulp.src(conf.instrumentableSources, {
                    read: true,
                    base: conf.instrumentableSourcesBase
                })
                    .pipe(gulp.dest(conf.testWorkDir))
                    // instrumentation du code
                    .pipe(istanbul(conf.istanbulOpt))
                    .pipe(istanbul.hookRequire()) // Force `require` to return covered files
            );
        }
    }
}

module.exports = InstrumentSourcesTest;
