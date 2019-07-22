"use strict";

const path = require("path");
const fs = require("fs");

const loadCoverage = require("remap-istanbul/lib/loadCoverage");
const remap = require("remap-istanbul/lib/remap");
const writeReport = require("remap-istanbul/lib/writeReport");

var Task = require("./../task");

class RemapReportsTests extends Task {
    task(gulp, helper, conf, project) {
        let reports = {};
        conf.remap.reporters.forEach(function (reporter) {
        
            if( conf.remap.reportOpts[reporter] && conf.remap.reportOpts[reporter].dir ) {
                reports[reporter] = path.join(conf.remap.reportOpts[reporter].dir, conf.remap.reportOpts[reporter].file || "");
            }
        });

        return (done) => {
            let tscOutDir = project.tsConfig.compilerOptions || {};
            tscOutDir = tscOutDir.outDir || undefined;
            var dest = tscOutDir ? path.resolve(project.dir, tscOutDir) : project.dir;

            var coverage = loadCoverage(path.join(project.dir, conf.merge.reportOpts.dir, "coverage.json"));
            var collector = remap(coverage, {
                mapFileName: (name) => {
                    return name.replace(dest, project.dir);
                },
                warnMissingSourceMaps: false
            });

            let p = Promise.resolve(true);
            if(reports && Object.keys(reports).length > 0) {
                if (!helper.folderExists(path.join(project.dir, conf.remap.reportOpts.dir))) fs.mkdirSync(path.join(project.dir, conf.remap.reportOpts.dir));
                Object.keys(reports).forEach((myReporter) => {
                    if (!helper.folderExists(path.join(project.dir, conf.remap.reportOpts[myReporter].dir))) 
                    {
                        fs.mkdirSync(path.join(project.dir, conf.remap.reportOpts[myReporter].dir));
                    }
                    p = p.then(() => {
                        return writeReport(collector, myReporter, {}, path.join("./", reports[myReporter]));
                    });
                });
                
            }
            return p.then(() => done());
        }
    }
}

module.exports = RemapReportsTests;