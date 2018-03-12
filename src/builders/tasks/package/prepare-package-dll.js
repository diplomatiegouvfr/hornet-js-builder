"use strict";

const path = require("path");
const _ = require("lodash");
const webpack = require("webpack");
const gulpEol = require("gulp-eol");
const gutil = require("gulp-util");
const webpackStream = require("webpack-stream");
const merge = require('webpack-merge');

const Task = require("../task");

class PreparePackageDll extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, debugMode, watchMode) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.debugMode = debugMode;
        this.watchMode = watchMode;

        this.webpackConf = {
            entry: (conf.dev && conf.dev.dllEntry) || {},
            output: {
                path: path.join(project.dir, conf.static) ,
                filename: path.join(conf.js, conf.dll, "dll_[name].js"),
                library: "[name]_library",
                //libraryTarget: "commonjs2", // remove for import script html
                publicPath: "./static-" + project.packageJson.version + "/",
            },
            plugins: [
                new webpack.DllPlugin({
                    context: path.join(project.dir, "node_modules", "app"),
                    name: "[name]_library",
                    path: path.join(project.dir, conf.static, conf.js, conf.dll, "[name]-manifest.json")
                })
            ]

        }

    }

    task(gulp, helper, conf, project) {
        return (done) => {

            if((!conf.dev || !conf.dev.dllEntry)) {
                return done();
            }
            
            if(helper.folderExists(path.join(project.dir, conf.static, conf.js, conf.dll))){
                helper.warn("Présence des dll vendor, pour les supprimer : 'hb clean:static-dll'");
                return done();
            }

            // initialisation de la conf webpack
            var confWebPack = require("../../../webpack/default-webpack-config.js").browser(project, conf, helper.isDebug());
            delete confWebPack.entry;
            delete confWebPack.output;

            confWebPack = merge(this.webpackConf, confWebPack);
            this.webpackConf = merge(confWebPack, conf.webPackConfiguration);

            this.webpackConf = merge( this.webpackConf, { externals: {"net": "{}", "fs": "{}", "dns": "{}", "v8": "{}", "module": "{}"}});

            // Configuration dynamique de webpack
            if (!this.debugMode) {
                process.env.NODE_ENV = "production";
            } else {
                this.webpackConf.plugins.push(new webpack.LoaderOptionsPlugin({ debug: true }));
            }

            // Activation du context
            if (conf.clientContext && _.isArray(conf.clientContext)) {
                conf.clientContext.forEach((contextElt) => {
                    this.webpackConf.plugins.splice(1, 0, new webpack.ContextReplacementPlugin(...contextElt)); 
                });
            }

            if (this.webpackConf.resolve.modules && _.isArray(this.webpackConf.resolve.modules)) {
                this.webpackConf.resolve.modules.forEach(function (dir) {
                    helper.warn("WEBPACK MODULE RESOLVER > répertoire déclaré :", dir);
                });
            }

            if (this.webpackConf.module && this.webpackConf.module.noParse && _.isArray(this.webpackConf.module.noParse)) {
                this.webpackConf.module.noParse.forEach(function (regexp) {
                    helper.warn("WEBPACK CONF > exclusions de :", regexp.toString());
                });
            } 
            
            helper.debug("WEBPACK CONF DLL:", this.webpackConf);

            webpack(this.webpackConf, (err, stats) => {
                if(err) done(err);
                gutil.log(stats.toString(this.webpackConf.stats));
                if (!this.watchMode) done();
            });

            if (this.watchMode) done();
        }
    }
}


module.exports = PreparePackageDll;