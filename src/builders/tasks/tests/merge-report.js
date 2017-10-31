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
            
            
            /*forEach(files, function (file) {
                var json = fs.readFileSync(file);
                map.merge(JSON.parse(json));
            });
            var output = path.resolve(options.out);
            mkdirp.sync(path.dirname(output));
            fs.writeFileSync(output, JSON.stringify(map));*/
            
            return  helper.stream(done, 
                gulp.src("**/coverage_*.json", {
                    base: conf.testReportDir, read: true
                })
                // Ecriture des rapports de couverture de code
                .pipe( this.mergeReports(helper)).on("_result", (argu) => {
                    helper.info(argu);
                }));
        }
    }

    mergeReports(helper) {

        var collector = new istanbul.Collector(),
        reporter = new istanbul.Reporter();
        //var map = istanbul.createCoverageMap({});

        function merge(file, encoding, done) {

            if (file.isBuffer()) {
                collector.add(JSON.parse(file.contents.toString('utf-8')));
            }
            if (file.isStream()) {
                this.emit('error', new Error("Stream not supported in merge report"));
                helper.error("Stream not supported in merge report");
                return done();
            }
            done();
        }

        function flush(done) {
            reporter.add('text');
            reporter.write(collector, false, function () {
                helper.info('All reports generated');
            });
            this.emit("_result", {merge: "ok"});
            done();
        }

        return through.obj(merge, flush);

    }
}


module.exports = MergeReportsTests;
