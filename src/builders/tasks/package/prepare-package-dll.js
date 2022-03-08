const path = require("path");
const log = require("fancy-log"); // remplacement gulp-util.log
const webpack = require("webpack");
const DependencyAnalyzerPlugin = require("../../../webpack/dependency-analyzer-plugin");
const State = require("../../state");
const PreparePackageClient = require("./prepare-package-client");

class PreparePackageDll extends PreparePackageClient {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, debugMode, watchMode) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.debugMode = debugMode;
        this.watchMode = watchMode;

        // initialisation de la conf webpack
        delete this.configuration.entry;
        delete this.configuration.output;

        /**
         * @param pConfiguration configuration du projet
         * @param wConfiguration configuration webpack du projet
         */
        this.webpackConf = (pConfiguration, wConfiguration, wProject) => {
            return {
                mode: "development",
                entry: (pConfiguration.dev && pConfiguration.dev.dllEntry) || {},
                output: {
                    path: path.join(wProject.dir, conf.tscOutDir || "", pConfiguration.static),
                    filename: path.join(pConfiguration.js, pConfiguration.dll, "[name]", "dll_[name].js"),
                    library: "[name]_library",
                    publicPath: `${wProject.staticPath || "static"}`,
                },
                plugins: [
                    new webpack.DllPlugin({
                        context: path.join(wProject.dir, "node_modules"),
                        name: "[name]_library",
                        path: path.join(wProject.dir, conf.tscOutDir || "", pConfiguration.static, pConfiguration.js, pConfiguration.dll, "[name]", "manifest.json"),
                    }),
                    ...wConfiguration.plugins.filter((elt) => {
                        return !(elt instanceof DependencyAnalyzerPlugin);
                    }),
                ],
                // mode: "development",
                externals: [
                    new RegExp(".+\\.scss"),
                    { async_hooks: "{}", child_process: "{}", tls: "{}", net: "{}", fs: "{}", dns: "{}", v8: "{}", module: "{}", cluster: "{}" },
                    wConfiguration.externals,
                ],
                resolve: wConfiguration.resolve,
                resolveLoader: wConfiguration.resolveLoader,
                module: wConfiguration.module,
                optimization: {},
            };
        };
    }

    task(gulp, helper, conf, project) {
        return (done) => {

            if (helper.folderExists(path.join(project.dir, conf.tscOutDir || "", conf.static, conf.js, conf.dll))) {
                helper.warn("Présence des dll vendor, pour les supprimer : 'hb clean:static-dll'");
            }

            this.buildWebpackConfiguration(project, conf, helper);

            if (!conf.dev || !conf.dev.dllEntry) {
                return done();
            }

            this.configuration.dev &&
                helper.each(Object.keys(this.configuration.dev.dllEntry), (dllName) => {
                    this.configuration.dev.dllEntry[dllName] = this.configuration.dev.dllEntry[dllName].filter((name) => {
                        return !State.externalDependencies[project.name][name];
                    });
                });

            this.configuration = this.webpackConf(conf, this.configuration, project);

            helper.debug("WEBPACK CONF DLL:", this.configuration);

            webpack(this.configuration, (err, stats) => {
                if (err) done(err);
                log(stats.toString(this.configuration.stats));
                if (!this.watchMode) done();
            });

            if (this.watchMode) done();
        };
    }
}

module.exports = PreparePackageDll;
