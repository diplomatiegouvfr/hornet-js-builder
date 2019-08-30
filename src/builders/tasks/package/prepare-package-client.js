"use strict";

const _ = require("lodash");
const webpack = require("webpack");
const log = require("fancy-log"); // remplacement gulp-util.log
const path = require("path");
const merge = require("webpack-merge");
const RemoveDefinePlugin = require("../../../webpack/webpack-replace-plugin");
const webpackConfigPart = require("../../configuration/webpack/config-parts");
const Task = require("../task");

class PreparePackageClient extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, debugMode, watchMode, exitWatch) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.debugMode = debugMode;
        this.watchMode = watchMode;
        this.exitWatch = exitWatch;
        this.done = false;
        this.configuration = webpackConfigPart.getDefaultConf(project, conf, helper);

        // Possibilité de surcharger la configuration globale par le projet
        let env = (process.env.NODE_ENV || "").toLowerCase();
        if (helper.fileExists(path.join(project.dir, "webpack.config." + env + ".js"))) {
            this.webpackConfigFile = path.join(project.dir, "webpack.config." + env + ".js");
        } else if (helper.fileExists(path.join(project.dir, "webpack.config.js"))) {
            this.webpackConfigFile = path.join(project.dir, "webpack.config.js");
        } else {
            this.webpackConfigFile = undefined;
        }
        // Possibilité de compléter la configuration par le projet
        if (helper.fileExists(path.join(project.dir, "webpack.addons.config." + env + ".js"))) {
            this.webpackAddonsConfigFile = path.join(project.dir, "webpack.addons.config." + env + ".js");
        } else if (helper.fileExists(path.join(project.dir, "webpack.addons.config.js"))) {
            this.webpackAddonsConfigFile = path.join(project.dir, "webpack.addons.config.js");
        } else {
            this.webpackAddonsConfigFile = undefined;
        }
    }
    
    task(gulp, helper, conf, project) {
        return (done) => {
            this.buildWebpackConfiguration(project, conf, helper);
            webpack(this.configuration, (err, stats) => {
                if (err) done(err);
                log(stats.toString(this.configuration.stats));
                if (!this.done && (!this.watchMode || this.exitWatch) ) {
                    this.done = true;
                    done();
                }
            });
        }
    }

    /**
     * Contruit la configuration externals pour webpack
     * @param {*} conf - L'object de configuration du builder.js
     * @param {*} helper - L'object helper du builder
     */
    buildExternal(conf, helper) {

        const externals = (conf && conf.externals) || [];
        let confWebpack = { externals: undefined };

        if (conf.clientExclude) {

            if (conf.clientExclude.dirs && Array.isArray(conf.clientExclude.dirs)) {
                conf.clientExclude.dirs.forEach((excludeDir) => {
                    externals.push(new RegExp(excludeDir + "/.*"));
                });
            }

            if (conf.clientExclude.filters && Array.isArray(conf.clientExclude.filters)) {
                conf.clientExclude.filters.forEach((excludeFilter) => {
                    externals.push(new RegExp(excludeFilter));
                });
            }

            if (conf.clientExclude.modules && Array.isArray(conf.clientExclude.modules)) {
                conf.clientExclude.modules.forEach((excludeModules) => {
                    externals.push(excludeModules);
                });
            }

            if (conf.clientNoParse && Array.isArray(conf.clientNoParse)) {
                confWebpack = { externals: undefined, module: { noParse: conf.clientNoParse } };
            }
        } else {
            externals.push(new RegExp(".*/src/services/data/.*"));
            externals.push(new RegExp(".*/src/services/*-data.*"));
        }

        Array.prototype.push.apply(externals, ["net", "fs", "dns"]);

        confWebpack.externals = (context, request, callback) => {

            for (let i = 0; i < externals.length; i++) {
                let extern = externals[i];
                if (extern.test) { // c'est une regexp'
                    if (extern.test(request)) {
                        return callback(null, "{}");
                    }
                } else if (request == extern) {
                    return callback(null, "{}");
                }
            }

            return callback();
        };
        return confWebpack;
    }

    /**
     * Construit la configuration webpack soit à partir d'un fichier présent dans le projet (webpack.config.js ou webpack.addons.config.js)
     * @param {*} project - L'object de description du projet
     * @param {*} conf - L'object de configuration du builder.js
     * @param {*} helper - L'object helper du builder
     */
    buildWebpackConfiguration(project, conf, helper) {
        // initialisation de la conf webpack
        if (this.webpackConfigFile) {
            this.configuration = require(this.webpackConfigFile)(project, conf, helper, webpackConfigPart, webpack);
        } else {
            this.configuration = merge(this.configuration, conf.webPackConfiguration);

            let confWithExternals = this.buildExternal(conf, helper);
            this.configuration = merge(this.configuration, confWithExternals);

            this.configuration = merge(this.configuration, webpackConfigPart.autoCodeSplittingChunks(project, conf, helper));
            this.configuration = merge(this.configuration, webpackConfigPart.addJsxLoader(project, conf, helper));
            this.configuration = merge(this.configuration, webpackConfigPart.addSourceMapLoader(project, conf, helper));
            this.configuration = merge(this.configuration, webpackConfigPart.addScssLoader(project, conf, helper));
            this.configuration = merge(this.configuration, webpackConfigPart.addImageLoader(project, conf, helper));
            this.configuration = merge(this.configuration, webpackConfigPart.addFontLoader(project, conf, helper));
            
            if (helper.isWebpackVisualizer()) {
                this.configuration = merge(this.configuration, webpackConfigPart.addChunkVizualizer(project, conf, helper));
            }
            // Configuration dynamique de webpack
            if (!this.debugMode) {
                process.env.NODE_ENV = "production";
                this.configuration.plugins.push(new RemoveDefinePlugin({
                    include: (filepath) => { return filepath.endsWith("hornet-js-utils/src/index.js"); },
                }));
                this.configuration.plugins.push(new webpack.DefinePlugin({
                    'process.env': {
                        'NODE_ENV': '"production"'
                    }
                }));
            } else {
                this.configuration = merge(this.configuration, webpackConfigPart.addGlobalPluginsOption(project, conf, helper));
                this.configuration["devtool"] = "eval-source-map";//inline-source-map eval-source-map
                this.configuration["mode"] = "development";
                helper.info("WEBPACK MODE DEV activé(optimizatoin désactivée).");
                this.configuration["optimization"] = {};
            }

            if(helper.isDebug()) {
                this.configuration = merge(this.configuration, webpackConfigPart.addReportFileSizePlugin(project, conf, helper));
            }

            // Activation minification 
            if (!this.debugMode && !helper.isSkipMinified()) {
                this.configuration = merge(this.configuration, webpackConfigPart.addUglifyPlugins(project, conf, helper));
            }

            // Activation du context
            this.configuration = merge(this.configuration, webpackConfigPart.addConfContextReplacement(project, conf, helper));


            this.configuration.watch = this.watchMode === true;

            if (this.configuration.resolve.modules && Array.isArray(this.configuration.resolve.modules)) {
                this.configuration.resolve.modules.forEach(function (dir) {
                    helper.warn("WEBPACK MODULE RESOLVER > répertoire déclaré :", dir);
                });
            }

            if (this.configuration.module && this.configuration.module.noParse && Array.isArray(this.configuration.module.noParse)) {
                this.configuration.module.noParse.forEach(function (regexp) {
                    helper.warn("WEBPACK CONF > exclusions de :", regexp.toString());
                });
            }

            
            this.configuration['profile'] = true;
            if (this.webpackAddonsConfigFile) {
                this.configuration = require(this.webpackAddonsConfigFile)(project, conf, helper, webpackConfigPart, this.configuration, webpack);
            }
            helper.debug("WEBPACK CONF CLIENT :", this.configuration);
        }
    }
}


module.exports = PreparePackageClient;