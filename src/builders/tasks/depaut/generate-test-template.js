"use strict";

const Task = require("./../task");
const path = require("path");
const fs = require("fs");

const replace = require("gulp-token-replace");

class GenerateTestTemplate  extends Task {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
    }

    task(gulp, helper, conf, project) {

        return (done) => {
            
            let files = fs.readdirSync(path.join(conf.buildWorkDir, conf.testEnvironment.configuration));
            let streams = [];
            let defaultDepautValue = {
                INSTANCE:1,
                PORT_SERVER:8888,
                PORT_MONITOR:9999,
                INSTANCE_NAME:""
            };
            files.forEach((file) => {
                var nextRead = path.join(path.join(conf.buildWorkDir, conf.testEnvironment.configuration), file);
                var stats = fs.lstatSync(nextRead);
                if (stats.isFile()) {
                    streams.push(gulp.src(conf.environment.templates + "/*.json") 
                        .pipe(replace(
                            { prefix: '#{', 
                            suffix: '}', 
                            preserveUnknownTokens : true,
                            tokens: Object.assign(require(path.join(conf.baseDir, nextRead)), defaultDepautValue)
                            }))
                        .pipe(gulp.dest(path.join(conf.buildWorkDir, conf.testEnvironment.templates, file.split(".")[0]))));
                }
            });
            helper.stream(done, streams);
        }
    }
}


module.exports = GenerateTestTemplate;
