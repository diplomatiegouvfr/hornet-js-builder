"use strict";

const path = require("path");
const _ = require("lodash");
const webpack = require("webpack");
const log = require('fancy-log'); // remplacement gulp-util.log
const State = require("../../state");
const merge = require('webpack-merge');

const PreparePackageClient = require("./prepare-package-client");

class PreparePackageDll extends PreparePackageClient {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, debugMode, watchMode) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.debugMode = debugMode;
        this.watchMode = watchMode;


        // initialisation de la conf webpack
        delete this.configuration.entry;
        delete this.configuration.output;

        this.webpackConf = {
            entry: (conf.dev && conf.dev.dllEntry) || {},
            output: {
                path: path.join(project.dir, conf.static),
                filename: path.join(conf.js, conf.dll, "dll_[name].js"),
                library: "[name]_library",
                //sourceType: "commonjs2", // remove for import script html
                publicPath: "./static-" + project.packageJson.version + "/",
            },
            plugins: [
                new webpack.DllPlugin({
                    context: path.join(project.dir, "node_modules"),
                    name: "[name]_library",
                    path: path.join(project.dir, conf.static, conf.js, conf.dll, "[name]-manifest.json")
                })
            ]

        }
        this.configuration = merge(this.configuration, this.webpackConf);

    }

    task(gulp, helper, conf, project) {
        return (done) => {
            if ((!conf.dev || !conf.dev.dllEntry)) {
                return done();
            }

            conf.dev && helper.each(Object.keys(conf.dev.dllEntry), (dllName) => {
                conf.dev.dllEntry[dllName] = conf.dev.dllEntry[dllName].filter((name) => {
                    return !State.externalDependencies[project.name][name];
                });
            });


            if (helper.folderExists(path.join(project.dir, conf.static, conf.js, conf.dll))) {
                helper.warn("Présence des dll vendor, pour les supprimer : 'hb clean:static-dll'");
                return done();
            }

            this.buildWebpackConfiguration(project, conf, helper);


            this.configuration = merge(this.configuration, { externals: { "child_process": "{}", "tls": "{}", "net": "{}", "fs": "{}", "dns": "{}", "v8": "{}", "module": "{}" } });

            helper.debug("WEBPACK CONF DLL:", this.configuration);

            webpack(this.configuration, (err, stats) => {
                if (err) done(err);
                log(stats.toString(this.configuration.stats));
                if (!this.watchMode) done();
            });

            if (this.watchMode) done();
        }
    }
}


module.exports = PreparePackageDll;