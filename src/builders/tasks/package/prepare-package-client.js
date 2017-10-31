"use strict";

const path = require("path");
const _ = require("lodash");
const webpack = require("webpack");
const gulpEol = require("gulp-eol");
const gutil = require("gulp-util");
const webpackStream = require("webpack-stream");
const merge = require('webpack-merge');

const Task = require("../task");

class PreparePackageClient extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, debugMode, watchMode) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.debugMode = debugMode;
        this.watchMode = watchMode;
    }

    task(gulp, helper, conf, project) {
        return (done) => {

            // initialisation de la conf webpack
            var confWebPack = require("../../../webpack/default-webpack-config.js").browser(project, conf, helper.isDebug());
            if (project.builderJs && project.builderJs.webpack && project.builderJs.webpack.watchMode) {
                confWebPack = require("../../../webpack/devserver-webpack-config.js").browser(project, conf, helper.isDebug());
            }
            conf.webPackConfiguration = merge(confWebPack, conf.webPackConfiguration);

            if (!conf.externals) {
                conf.externals = [];
            }

            if (conf.clientExclude) {
                
                if (conf.clientExclude.dirs && _.isArray(conf.clientExclude.dirs)) {
                    let externals = {};
                    conf.clientExclude.dirs.forEach((excludeDir)=> {
                        conf.externals.push(new RegExp(excludeDir + "/.*"));
                    });
                }

                if (conf.clientExclude.filters && _.isArray(conf.clientExclude.filters)) {
                    let externals = {};
                    conf.clientExclude.filters.forEach((excludeFilter)=> {
                        conf.externals.push(new RegExp(excludeFilter));
                    });
                }  

                if (conf.clientExclude.modules && _.isArray(conf.clientExclude.modules)) {
                    let externals = {};
                    conf.clientExclude.modules.forEach((excludeModules)=> {
                        conf.externals.push(excludeModules);
                    });
                }  

                if (conf.clientNoParse && _.isArray(conf.clientNoParse)) {
                    conf.webPackConfiguration = merge( conf.webPackConfiguration, { module: {noParse: conf.clientNoParse} });
                }
            } else {
                conf.externals.push(new RegExp(".*/src/services/data/.*"));
                conf.externals.push(new RegExp(".*/src/services/*-data.*"));
            }

            Array.prototype.push.apply(conf.externals, ["net", "fs", "dns"]);

            conf.webPackConfiguration.externals = (context, request, callback) => {

                for(let i = 0; i < conf.externals.length; i++) {
                    let extern = conf.externals[i];
                    if (extern.test) { // c'est une regexp'
                        if (extern.test(request)) {
                            helper.debug("Externals exclude : " +  request);
                            return callback(null, "{}");
                        } 
                    } else if (request == extern) {
                        helper.debug("Externals exclude : " +  request);
                        return callback(null, "{}");
                    }
                }

                return callback();
            }

            // Configuration dynamique de webpack
            if (!this.debugMode) {
                process.env.NODE_ENV = "production";
            } else {
                conf.webPackConfiguration.plugins.push(new webpack.LoaderOptionsPlugin({ debug: true }));
            }

            // Activation minification 
            if (!this.debugMode && !helper.isSkipMinified()) {
                const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
                conf.webPackConfiguration.plugins.push(new UglifyJSPlugin({
                    compress: {
                        warnings: false
                    },
                    sourceMap: true
                }));
            }

            // Activation du context
            if (conf.clientContext && _.isArray(conf.clientContext)) {
                conf.clientContext.forEach((contextElt) => {
                    conf.webPackConfiguration.plugins.splice(1, 0, new webpack.ContextReplacementPlugin(...contextElt)); 
                });
            }

            if (helper.isDevMode()) {
                if (conf.dev && conf.dev.dllEntry){
                    for(let dll in conf.dev.dllEntry) {
                        conf.webPackConfiguration.plugins.splice(1, 0, new webpack.DllReferencePlugin({
                            context: path.join(project.dir, "node_modules", "app"),
                            manifest: require(path.join(project.dir, dll + "-manifest.json")),
                        }));
                    }

                }
            }

            conf.webPackConfiguration.watch = this.watchMode === true;

            if (conf.webPackConfiguration.resolve.modules && _.isArray(conf.webPackConfiguration.resolve.modules)) {
                conf.webPackConfiguration.resolve.modules.forEach(function (dir) {
                    helper.warn("WEBPACK MODULE RESOLVER > répertoire déclaré :", dir);
                });
            }

            if (conf.webPackConfiguration.module && conf.webPackConfiguration.module.noParse && _.isArray(conf.webPackConfiguration.module.noParse)) {
                conf.webPackConfiguration.module.noParse.forEach(function (regexp) {
                    helper.warn("WEBPACK CONF > exclusions de :", regexp.toString());
                });
            }

            helper.debug("WEBPACK CONF CLIENT :", conf.webPackConfiguration);

            webpack(conf.webPackConfiguration, (err, stats) => {
                if(err) done(err);
                gutil.log(stats.toString(conf.webPackConfiguration.stats));
                if (!this.watchMode) done();
            });

            if (this.watchMode) done();
        }
    }
}


module.exports = PreparePackageClient;