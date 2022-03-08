const fs = require("fs");
const path = require("path");
const libCoverage = require("istanbul-lib-coverage");
const libReport = require("istanbul-lib-report");
const reports = require("istanbul-reports");
const through = require("through2");
const CoverageTransformer = require("./remap/coverage-transformer");

let remapMap;

const Task = require("../task");

class RemapReportsTests extends Task {
    task(gulp, helper, conf, project) {
        return (done) => {
            delete global.__coverage__;
            remapMap = libCoverage.createCoverageMap({});

            return helper.stream(
                done,
                gulp
                    .src("**/coverage.json", {
                        base: conf.merge.reportOpts.dir,
                        read: true,
                        cwd: conf.merge.reportOpts.dir,
                    })
                    // Ecriture des rapports de couverture de code
                    .pipe(this.remapReports(helper, conf, project))
                    .on("finish", (err) => {
                        if (err) helper.error(`Erreur durant la synchronisation des rapports de couverture : ${err}`);
                    }),
            );
        };
    }

    remapReports(helper, conf, project) {
        let tscOutDir = project.tsConfig.compilerOptions || {};
        tscOutDir = tscOutDir.outDir || undefined;
        const dest = tscOutDir ? path.resolve(project.dir, tscOutDir) : project.dir;

        function remap(file, encoding, done) {
            if (file.isBuffer()) {
                try {
                    const instruResult = JSON.parse(file.contents.toString("utf-8"));

                    if (Object.keys(instruResult).length != 0) {
                        const ct = new CoverageTransformer({
                            mapFileName: (name) => {
                                return name.replace(dest, project.dir);
                            },
                            inputSourceMap: true,
                            warnMissingSourceMaps: false,
                            cwd: project.dir,
                        });
                        ct.addCoverage(instruResult);
                        remapMap.merge(ct.getFinalCoverage());
                    }
                } catch (err) {
                    helper.error(`Erreur durant l'étape de chargement de la synchronisation des rapports de couverture : ${err}`);
                    done(err);
                }
            }
            if (file.isStream()) {
                this.emit("error", new Error("Stream not supported in remap report"));
                helper.error("Stream not supported in remap report");
                return done();
            }
            done();
        }

        function flush(done) {
            if (Object.keys(remapMap.data) == 0) {
                helper.warn("Aucune couverture de test à resynchroniser.");
            }

            try {
                conf.remap.reporters.forEach((reporter) => {
                    const report = reports.create(reporter, {
                        skipEmpty: false,
                        skipFull: false,
                        ...(conf.remap.reportOpts[reporter] || {}),
                    });
                    const context = libReport.createContext({
                        dir: (conf.remap.reportOpts[reporter] && conf.remap.reportOpts[reporter].dir) || conf.remap.reportOpts.dir,
                        defaultSummarizer: "nested",
                        coverageMap: remapMap,
                    });
                    report.execute(context);
                });
                this.emit("finish");
            } catch (err) {
                helper.error(`Erreur durant l'étape d'écriture des rapports de la synchronisation des rapports de couverture : ${err}`);
                done(err);
            }
            done();
        }

        return through.obj(remap, flush);
    }
}

module.exports = RemapReportsTests;
