const path = require("path");
const Server = require('karma').Server;
const lodashmerge = require ("lodash.merge");

let fs = require("fs");
const merge = require("webpack-merge");
const webpackConfigPart = require('../../configuration/webpack/config-parts');

const getKarmaConf = require("../../configuration/karma/karma.conf");
const PreparePackageClient = require("../package/prepare-package-client");

class RunTestKarma extends PreparePackageClient {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.defaultTestsFileName = "tests.webpack.js";
        if (fs.existsSync(path.join(project.dir, this.defaultTestsFileName))) {
            this.defaultTestsFileName = path.join(project.dir, this.defaultTestsFileName);
        } else {
            helper.warn("Le fichier de test pour karma 'tests.webpack.js' est introuvable");
        }

        // Possibilité de surcharger la configuration globale par le projet
        let env = (process.env.NODE_ENV || "").toLowerCase();
        if (helper.fileExists(path.join(project.dir, "karma.config." + env + ".js"))) {
            this.karmaConfigFile = path.join(project.dir, "karma.config." + env + ".js");
        } else if(helper.fileExists(path.join(project.dir, "karma.config.js"))) {
            this.karmaConfigFile = path.join(project.dir, "karma.config.js");
        } else {
            this.karmaConfigFile = undefined;
        }
        // Possibilité de compléter la configuration par le projet
        if (helper.fileExists(path.join(project.dir, "karma.addons.config." + env + ".js"))) {
            this.karmaAddonsConfigFile = path.join(project.dir, "karma.addons.config." + env + ".js");
        } else if(helper.fileExists(path.join(project.dir, "karma.addons.config.js"))) {
            this.karmaAddonsConfigFile = path.join(project.dir, "karma.addons.config.js");
        } else {
            this.karmaAddonsConfigFile = undefined;
        }

        this.configuration = getKarmaConf(project, helper, conf, this.defaultTestsFileName);

        if (process.env.NODE_ENV !== "production" && conf.karma && conf.karma.template) {
            if (conf.karma.template.debug) {
                this.configuration.customDebugFile = conf.karma.template.debug;
            }

            if (conf.karma.template.context) {
                this.configuration.customContextFile = conf.karma.template.context;
            }

            if (conf.karma.template.clientContext) {
                this.configuration.customClientContextFile = conf.karma.template.clientContext;
            }
        }

        if (helper.getFile()) {
            this.configuration.preprocessors[path.join(conf.tscOutDir || "", helper.getFile().replace(/\.tsx?$/, ".js"))] = ["webpack", "sourcemap"];
        } else {
            this.configuration.plugins.push("karma-sonarqube-unit-reporter");
            this.configuration.reporters.push("sonarqubeUnit");
        }
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            
            if (helper.isSkipTests()) {
                helper.info("Exécution des tests annulée car l'option '--skipTests' a été utilisée.");
                return done();
            }

            if(this.karmaConfigFile) {
                this.configuration = require(this.karmaConfigFile)(project, conf, helper, webpackConfigPart);
            } else {
                this.configuration = lodashmerge(this.configuration, conf.karma);

                if (this.configuration.browsers && this.configuration.browsers[0] == "PhantomJS") {
                    this.configuration.files.unshift(path.join(project.dir, "node_modules", "babel-polyfill", "dist", "polyfill.min.js"))
                }
                this.configuration.webpack = merge(conf.webpack, merge(this.webpackConf(helper, conf, project, this.configuration), this.configuration.webpack));

                if(this.karmaAddonsConfigFile) {
                    this.configuration = require(this.karmaAddonsConfigFile)(this.configuration, project, conf, helper, webpackConfigPart);
                }
            }

            if(!helper.getFile() && !helper.fileExists(this.configuration.files[0])) {
                helper.warn("Exécution des tests Karma annulée car aucun tests à exécuter.");
                return done();
            }

            helper.debug("configuration karma", this.configuration);

            setTimeout(
            () => new Server(this.configuration, (exitCode) => {
                if(exitCode && helper.getStopOnError()) {
                    process.exit(1);
                    return done(exitCode);
                }
                done();
            }
            ).start(), 1000);
        }
    }

    webpackConf(helper, conf, project, confKarma) {

        let configuration = webpackConfigPart.getDefaultConf(project, conf, helper);
        delete configuration["entry"];
        delete configuration["output"];
        delete configuration["optimization"];

        configuration = merge( configuration, webpackConfigPart.addJsxLoader(project, conf, helper));
        // on force le loader de style pour mode embarqué dans les tests
        let sassConfiguration = webpackConfigPart.addScssLoader(project, conf, helper);
        sassConfiguration.module.rules[0].use[0] = "style-loader";
        configuration = merge( configuration, sassConfiguration);

        configuration = merge( configuration, webpackConfigPart.addImageLoader(project, conf, helper));
        configuration = merge( configuration, webpackConfigPart.addConfContextReplacement(project, conf.karma, helper));

        let customPreLoadersDir = path.resolve(__dirname, "../../..", "webpack") + path.sep;

        let testConfiguration = {
            output: {filename: '[name]' + '.js'},
            module: {
                rules: [{ 
                    test: /\.js$/,
                    loader: customPreLoadersDir + "add-file-name-test-loader",
                    options: {
                        original: ["tsx", "ts", "js"]
                    }
                }]
            },
            plugins: [],
            devtool: "inline-source-map",
            performance: {
                hints: false,
                assetFilter: function (assetFilename) {
                    return assetFilename.endsWith(".js");
                }
            },
            mode: "development"
        };

        if (!helper.getFile()) {
            testConfiguration.module.rules.push(// instrumentation du code du projet en utilisant le me instrumenter que pour test:mocha
                {
                    test: new RegExp(".*\/" + project.name + "\/.+\.js$"),
                    exclude: [new RegExp(".*\/" + helper.NODE_MODULES + "\/.+$"), new RegExp("tests.webpack.js$"), new RegExp(".*\/" + conf.target.test + "\/.+\.js$")],
                    use: {
                        loader: path.resolve(customPreLoadersDir, 'instanbul-webpack-loader.js'),
                    }
                }
            );
        }

        if (confKarma.browsers && confKarma.browsers[0] == "PhantomJS") {
            testConfiguration.module.rules.push({
                test: /\.js$/,
                use: {
                    loader: path.resolve(path.join(project.dir, helper.NODE_MODULES, "babel-loader")),
                    options: {
                        presets: [require(path.join(project.dir, helper.NODE_MODULES, "babel-preset-env"))]
                    }
                }
            });
        }

        if (helper.isWebpackVisualizer()) {
            helper.info("Ajout de l'analyse des chunks webpack '--webpackVisualizer' a été utilisée");
            const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
            testConfiguration.plugins.push(new BundleAnalyzerPlugin({
                reportFilename: path.resolve(path.join(project.dir, "dev", "webpack-visualizer.html")), analyzerMode: "static", openAnalyzer: false
            }));
        }

        configuration = merge(configuration, testConfiguration);

        // ajout des externals
        let confWithExternals = this.buildExternal(conf.karma, configuration, helper);
        configuration = merge(configuration, confWithExternals);
        configuration.externals = confWithExternals.externals;

        // on déclare les répertoires perso à webpack
        if(!configuration.resolve["alias"]) configuration.resolve["alias"] = {};

        configuration.resolve["alias"]["./appenders/console"] = path.resolve(path.join(project.dir, helper.NODE_MODULES, "log4js", "lib", "appenders", "console.js")) ;
        
        return configuration;
    }
}

module.exports = RunTestKarma;