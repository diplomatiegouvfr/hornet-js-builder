"use strict";

const path = require("path");
const fs = require("fs");
const gulpTsLint = require("gulp-tslint");
const gutil = require("gulp-util");
const chalk = require("chalk");

const Task = require("./../task");

/**
 * Gestion du tslint (qualité de code)
 */
class LintTask extends Task {

    task(gulp, helper, conf, project) {
        return (done) => {

            let lintRules = "tslint.json"
            let lintRelativeRulesPath = "./../../../conf";
            let lintRulesPath  = path.resolve(path.join(__dirname, lintRelativeRulesPath, lintRules));
            if (helper.getLintRules()) {
                if (path.isAbsolute(helper.getLintRules())) {
                    lintRulesPath = helper.getLintRules();
                } else {
                    lintRulesPath = path.normalize(path.join(project.dir, helper.getLintRules()));
                }

                fs.exists(lintRulesPath,(exists) => {
                    if(!exists){
                        gutil.log(
                            chalk.red("Rules file '" + lintRulesPath + "' does not exist")
                        );
                        process.exit(1);
                    }
                });
            }

            helper.stream(
                done,
                gulp.src(conf.sourcesTS)
                    .pipe(gulpTsLint(
                        {
                            //rulesDirectory: path.join(__dirname, "../../../../node_modules/tslint-microsoft-contrib"),
                            configuration: lintRulesPath,
                            formatter: helper.getLintReport()
                        })
                    )
                    .pipe(gulpTsLint.report({
                        emitError: false
                    }))
            );
        }
    }
}


module.exports = LintTask;
