const execa = require("execa");
const PluginError = require("plugin-error");
const through = require("through2");
const Helper = require("../../helpers");

module.exports = (options, project) => {
    function aggregate(file, encoding, done) {
        if (file.isStream()) {
            done(new PluginError("gulp-istanbul", "Streaming not supported"));
            return;
        }
        done();
    }

    function flush(done) {
        (async () => {
            Helper.debug("exécution de nyc avec ", ["instrument", ...options]);
            const subprocess = execa("nyc", ["instrument", ...options], {
                localDir: __dirname,
                preferLocal: true,
                cwd: project.dir,
            });

            subprocess.stdout.pipe(process.stdout);
            subprocess.stderr.pipe(process.stderr);

            try {
                const result = await subprocess;
                this.emit("_result", result);
            } catch (error) {
                this.emit("error", new PluginError("gulp-instanbul", error.exitCode > 0 ? "There were test failures" : error));
            }

            done();
        })();
    }

    return through.obj(aggregate, flush);
};
