"use strict";

const path = require("path");
const fs = require("fs");
const remapIstanbul = require("remap-istanbul/lib/gulpRemapIstanbul");

const loadCoverage = require("remap-istanbul/lib/loadCoverage");
const remap = require("remap-istanbul/lib/remap");
const writeReport = require("remap-istanbul/lib/writeReport");

var Task = require("./../task");

class RemapReportsTests extends Task {
    task(gulp, helper, conf, project) {
        let reports = {};
        conf.remap.reporters.forEach(function (reporter) {
        
            if( conf.remap.reportOpts[reporter] && conf.remap.reportOpts[reporter].dir) {
                reports[reporter] = path.join(conf.remap.reportOpts[reporter].dir, conf.remap.reportOpts[reporter].file || "");
            }
        });
        
        return (done) => {
            return  helper.stream(done, 
                gulp.src(path.join(project.dir, conf.merge.reportOpts.dir, "coverage.json"))
                .pipe(remapIstanbul({
                    reports: reports,
                    fail: true,
                    warn: helper.warn,
                    exclude: conf.remap.exclude
                })));
            }
        }
}

module.exports = RemapReportsTests;