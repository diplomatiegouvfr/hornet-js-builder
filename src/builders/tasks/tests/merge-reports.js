const path = require("path");
const libCoverage = require("istanbul-lib-coverage");
const libReport = require("istanbul-lib-report");
const reports = require("istanbul-reports");
const through = require("through2");

let mergedCoverageMap;

const Task = require("../task");

class MergeReportsTests extends Task {
    task(gulp, helper, conf, project) {
        return (done) => {
            delete global.__coverage__;
            mergedCoverageMap = libCoverage.createCoverageMap({});
            return helper.stream(
                done,
                gulp
                    .src("**/coverage_*.json", {
                        base: conf.testReportDir,
                        read: true,
                        cwd: project.dir,
                    })
                    // Ecriture des rapports de couverture de code
                    .pipe(this.mergeReports(helper, conf))
                    .on("finish", (err) => {
                        if (err) helper.error(`Erreur durant le merge des rapports de couverture : ${err}`);
                    }),
            );
        };
    }

    mergeReports(helper, conf) {
        function merge(file, encoding, done) {
            if (file.isBuffer()) {
                const instruResult = JSON.parse(file.contents.toString("utf-8"));

                if (Object.keys(instruResult).length != 0) {
                    for (const fileInstru in instruResult) {
                        const newResult = instruResult[fileInstru];

                        newResult.path = newResult.path.replace(`${path.sep}${conf.testWorkDir}${path.sep}`, conf.target.base.substring(1));

                        if (!helper.fileExists(newResult.path)) {
                            newResult.path += "x"; // jsx
                        }

                        delete instruResult[fileInstru];

                        instruResult[fileInstru.replace(`${path.sep}${conf.testWorkDir}${path.sep}`, conf.target.base.substring(1))] = newResult;
                    }
                    const map = libCoverage.createCoverageMap(instruResult);
                    mergedCoverageMap.merge(map);
                }
            }
            if (file.isStream()) {
                this.emit("error", new Error("Stream not supported in merge report"));
                helper.error("Stream not supported in merge report");
                return done();
            }
            done();
        }

        function flush(done) {
            if (Object.keys(mergedCoverageMap.data) == 0) {
                helper.warn("Aucune couverture de test à merger.");
                /* conf.merge.reporters = ["json"]; */
            }

            try {
                conf.merge.reporters.forEach((reporter) => {
                    const report = reports.create(reporter, {
                        skipEmpty: false,
                        skipFull: false,
                        ...(conf.merge.reportOpts[reporter] || {}),
                    });
                    const context = libReport.createContext({
                        dir: (conf.merge.reportOpts[reporter] && conf.merge.reportOpts[reporter].dir) || conf.merge.reportOpts.dir,
                        defaultSummarizer: "nested",
                        coverageMap: mergedCoverageMap,
                    });
                    report.execute(context);
                });
                this.emit("finish");
            } catch (err) {
                helper.error(`Erreur durant le merge des rapports de couverture : ${err}`);
                done(err);
            }
            done();
        }

        return through.obj(merge, flush);
    }
}

module.exports = MergeReportsTests;
