"use strict";

const path = require("path");
const fs = require("fs");
const mocha = require("gulp-mocha");
const istanbul = require("istanbul");
const through = require('through2');

var Task = require("./../task");

class MergeReportsTests extends Task {

    task(gulp, helper, conf, project) {
        return (done) => {
            return  helper.stream(done, 
                gulp.src("**/coverage_*.json", {
                    base: conf.testReportDir, read: true
                })
                // Ecriture des rapports de couverture de code
                .pipe( this.mergeReports(helper, conf)).on("finish", (err) => {
                    if(err) helper.error("Erreur durant le merge des rapports de couverture : " + err);
                }));
        }
    }

    mergeReports(helper, conf) {

        var collector = new istanbul.Collector();
        var Report = istanbul.Report;

        var reporters = conf.merge.reporters.map(function (reporter) {
            let reportOpts = conf.merge.reportOpts[reporter] || {};
            return Report.create(reporter, reportOpts);
          });

        function merge(file, encoding, done) {
            if (file.isBuffer()) {
                let instruResult = JSON.parse(file.contents.toString('utf-8'));
                if(Object.keys(instruResult).length != 0) {helper.info("instruResult", Object.keys(instruResult).length);
                    for(let file in instruResult) {
                        let newResult = instruResult[file];
                        
                        newResult.path = newResult.path.replace("/istanbul/", "/");
                        
                        if(!helper.fileExists(newResult.path)) {
                            newResult.path = newResult.path + "x";
                        }

                        delete instruResult[file];

                        instruResult[file.replace("/istanbul/", "/")] = newResult;

                    }
                    collector.add(instruResult);
                }
            }
            if (file.isStream()) {
                this.emit('error', new Error("Stream not supported in merge report"));
                helper.error("Stream not supported in merge report");
                return done();
            }
            done();
        }

        function flush(done) {
            try{
                reporters.forEach(function (reporter) {
                    try {
                        reporter.writeReport(collector, true, function () {
                            helper.info('report generated', reporter);
                        })
                    } catch (err) {
                        helper.error("Erreur durant le merge des rapports de couverture : " + err);
                        done(err);
                    }
                });
                this.emit("finish");
            } catch(err) {
                helper.error("Erreur durant le merge des rapports de couverture : " + err);
                done(err);
            }
            done();
        }

        return through.obj(merge, flush);

    }
}


module.exports = MergeReportsTests;
