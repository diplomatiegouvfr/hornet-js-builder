const domain = require("domain");
const fs = require("fs");
const path = require("path");
const reqCwd = require("import-cwd");
const libCoverage = require("istanbul-lib-coverage");
const libReport = require("istanbul-lib-report");
const reports = require("istanbul-reports");
const Mocha = require("mocha");
const { loadOptions } = require("mocha/lib/cli/options");
const PluginError = require("plugin-error");
const through = require("through2");

const configWatermarks = {
    statements: [50, 80],
    functions: [50, 80],
    branches: [50, 80],
    lines: [50, 80],
};

module.exports = function (opts = {}, extendsOpts = {}, istanbulConf = {}, project = {}) {
    const runnerOpts = { ...loadOptions(opts), ...extendsOpts };
    const mocha = new Mocha(runnerOpts);
    const cache = {};

    for (const key in require.cache) {
        cache[key] = true;
    }

    function clearCache() {
        for (const key in require.cache) {
            if (!cache[key] && !/\.node$/.test(key)) {
                delete require.cache[key];
            }
        }
    }

    if (Array.isArray(opts.require) && opts.require.length) {
        opts.require.forEach(function (x) {
            reqCwd(x);
        });
    }

    function aggregate(file, encoding, done) {
        if (!file.path) {
            return done();
        }
        mocha.addFile(file.path);
        done();
    }

    function flush(done) {
        delete global.__coverage__;
        const d = domain.create();
        let runner;

        const handleException = (err) => {
            if (runner) {
                runner.uncaught(err);
            } else {
                clearCache();
                this.emit(
                    "error",
                    new PluginError("gulp-mocha", err, {
                        stack: err.stack,
                        showStack: true,
                    }),
                );
                done();
            }
        };

        d.on("error", handleException);
        d.run(() => {
            try {
                runner = mocha.run((errCount) => {
                    clearCache();

                    if (errCount > 0) {
                        this.emit(
                            "error",
                            new PluginError("gulp-mocha", `${errCount} ` + `test(s) failed.`, {
                                showStack: false,
                            }),
                        );
                    }
                    //
                    fs.writeFileSync(path.join(project.dir, ".nyc_out.json"), JSON.stringify(global.__coverage__, null, 4));
                    const coverageMap = libCoverage.createCoverageMap(global.__coverage__);

                    istanbulConf.reporters.forEach((reporter) => {
                        const report = reports.create(reporter, {
                            skipEmpty: false,
                            skipFull: false,
                            ...(istanbulConf.reportOpts[reporter] || {}),
                        });
                        const context = libReport.createContext({
                            dir: (istanbulConf.reportOpts[reporter] && istanbulConf.reportOpts[reporter].dir) || istanbulConf.reportOpts.dir,
                            defaultSummarizer: "nested",
                            coverageMap,
                        });
                        report.execute(context);
                    });
                    this.emit("end");
                    done();
                });
            } catch (err) {
                handleException(err);
            }
        });
    }

    return through.obj({ objectMode: true }, aggregate, flush);
};
