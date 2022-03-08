const path = require("path");
const dargs = require("dargs");
const istanbul = require("../../../gulp/istanbul");
const Task = require("../task");

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

            helper.debug("Intrumentation :", conf.instrumentableSources, ` vers : "${conf.testWorkDir}"`, `avec base : "${conf.instrumentableSourcesBase}"`);
            helper.stream(
                done,
                gulp
                    .src(conf.instrumentableSources, {
                        read: true,
                        base: conf.instrumentableSourcesBase,
                        cwd: project.dir,
                    })
                    // instrumentation du code
                    .pipe(istanbul([...dargs(conf.istanbul.instrumenter), conf.testWorkDir], project)),
            );
        };
    }
}

module.exports = InstrumentSourcesTest;
