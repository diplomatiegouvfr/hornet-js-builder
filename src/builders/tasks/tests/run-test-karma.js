const path = require("path");
const mocha = require("gulp-mocha");
const chalk = require("chalk");
const Server = require('karma').Server;
const Config = require('karma').Config;
const constants = require('karma').constants;
const State = require("../../state");
const _ = require("lodash");

let webpack = require("webpack");
let jsonLoaderName = require.resolve("json-loader");
let jsxLoaderName = require.resolve("jsx-loader");
let fs = require("fs");
const merge = require("webpack-merge");
const ExtractTextPlugin = require("extract-text-webpack-plugin");

const getKarmaConf = require("../../configuration/karma/karma.conf");
const PreparePackageClient = require("../package/prepare-package-client");

class RunTestKarma extends PreparePackageClient {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
        this.config = {
            basePath: project.dir,
            files: [
                (helper.getFile() && helper.getFile().replace(/\.tsx?$/, ".js")) || "tests.webpack.js",//, "src/**/*.js" pour rapport à vide
            ],
            customLaunchers: {
                'PhantomJS_custom': {
                    base: 'PhantomJS',
                    debug: true,
                }
            },
            browsers: ["PhantomJS"],
            port: 9876,
            colors: true,
            singleRun: !helper.getFile(),
            autoWatch: helper.getFile() ? true : false,
            customLaunchers: {

            },
            // level of logging
            // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
            logLevel: constants.LOG_ERROR,
            plugins: [
                "karma-requirejs",
                "karma-mocha",
                "karma-chrome-launcher",
                "karma-phantomjs-launcher",
                "karma-firefox-launcher",
                "karma-ie-launcher",
                "karma-junit-reporter",
                "karma-mocha-reporter",
                "karma-html-reporter",
                "karma-coverage",
                "karma-sourcemap-loader",
                "karma-webpack",
                "karma-commonjs"
            ],
            frameworks: ["mocha"],
            client: {
                mocha: {
                    //grep: "*.karma.js",
                    timeout: 15000,
                    allowUncaught: true,
                }
            },
            preprocessors: {
                // "src/**/*.js": ['coverage'], // inutil si loader webpack
                "*.js": ["webpack", "sourcemap"]
            },
            // list of files to exclude
            exclude: [],
            // test results reporter to use
            // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
            reporters: ["mocha", "coverage", "html", "junit"],
            junitReporter: {
                outputFile: path.join(conf.karma.reportOpts.dir, "test-results.xml"),
                useBrowserName: false,
                suite: project.name,
                xmlVersion: 1
            },
            coverageReporter: {
                dir: "./test_report/karma",
                //includeAllSources: true,
                reporters: [{
                    type: "html",
                    subdir: "./html"
                },
                {
                    type: "cobertura",
                    subdir: "."
                },
                {
                    type: "json",
                    subdir: ".",
                    file: "coverage_karma.json"
                }, {
                    type: "lcov",
                    subdir: "./lcov",
                    file: "lcov.info"
                },
                {
                    type: "text",
                }
                ]
            },
            webpack: {
                devtool: "inline-source-map"
            },
            webpackMiddleware: {
                // webpack-dev-middleware configuration
                stats: "errors-only"
            }
        };

        if (process.env.NODE_ENV !== "production" && conf.karma && conf.karma.template) {
            if (conf.karma.template.debug) {
                this.config.customDebugFile = conf.karma.template.debug;
            }

            if (conf.karma.template.context) {
                this.config.customContextFile = conf.karma.template.context;
            }

            if (conf.karma.template.clientContext) {
                this.config.customClientContextFile = conf.karma.template.clientContext;
            }
        }

        if (helper.getFile()) {
            this.config.preprocessors[(helper.getFile() && helper.getFile().replace(/\.tsx?$/, ".js"))] = ["webpack", "sourcemap"];
        }
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            this.config = _.merge(this.config, conf.karma);

            if (this.config.browsers && this.config.browsers[0] == "PhantomJS") {
                this.config.files.unshift(path.join(__dirname, "../../../../node_modules", "babel-polyfill", "dist", "polyfill.min.js"))
            }

            this.config.webpack = merge(conf.webpack, merge(this.webpackConf(helper, conf, project, this.config), this.config.webpack));
            if (helper.isSkipTests()) {
                helper.info("Exécution des tests annulée car l'option '--skipTests' a été utilisée");
                return done();
            }

            helper.debug("configuration webpack", this.config.webpack);

            new Server(this.config, (exitCode) => {
                done();
            }
            ).start();
        }
    }

    webpackConf(helper, conf, project, confKarma) {

        let routesDirs = this.arrayToString("sourcesDirs", conf.routesDirs);
        let routesSuffix = "-routes.js";
        let routesText = "// WEBPACK_AUTO_GENERATE_CLIENT_ROUTE_LOADING";

        let jsonLoaderDir = helper.getStringBefore(jsonLoaderName, "json-loader");
        helper.debug("jsonLoaderDir:", jsonLoaderDir);
        let jsxLoaderDir = helper.getStringBefore(jsxLoaderName, "jsx-loader");
        helper.debug("jsxLoaderDir:", jsxLoaderDir);

        let preLoadersTestRegex = new RegExp(conf.clientJs + "$");

        let customPreLoadersDir = path.resolve(__dirname, "../../..", "webpack") + path.sep;

        let configuration = {
            module: {
                rules: [{
                    test: /(\.jsx$|rc-calendar)/,
                    loader: jsxLoaderDir + "jsx-loader?harmony"
                }, {
                    test: /\.json$/,
                    loader: jsonLoaderDir + "json-loader"
                },
                {
                    // Permet d"ajouter le chargement asynchrone des routes dans client.js
                    test: preLoadersTestRegex,
                    enforce: "pre",
                    loader: customPreLoadersDir + "webpack-component-loader-processor?" + routesDirs +
                    "&fileSuffix=" + routesSuffix + "&replaceText=" + routesText
                },
                {
                    enforce: 'pre',
                    test: /\.js$/,
                    loader: "source-map-loader",
                    exclude: [path.resolve(project.dir, helper.NODE_MODULES_APP)]
                }, {
                    test: /\.css$/,
                    //use: [ 'style-loader', 'css-loader' ]
                    use: ExtractTextPlugin.extract({
                        fallback: "style-loader",
                        use: "css-loader"
                    })
                }, {
                    test: /\.(jpe?g|gif|png)$/,
                    loader: 'file-loader?name=img/[name].[ext]&publicPath=static/'
                }
                ]
            },
            resolve: {
                extensions: [".js", ".json", ".jsx", ".tsx", ".ts", ".css"],
                mainFields: ["webpack", "browser", "web", "browserify", "main", "module"]
            },
            externals: {
            },
            resolveLoader: {
                modules: [path.join(__dirname, "../../../../node_modules"), path.resolve(path.join(project.dir, helper.NODE_MODULES_TEST))]
            },
            devtool: "eval-source-map",
            plugins: [
                new ExtractTextPlugin('../css/[name].css')
            ],
            stats: {
                colors: false,
                hash: true,
                version: true,
                timings: true,
                publicPath: true,
                assets: true,
                chunks: false,
                errors: true,
                errorDetails: true,
                warnings: false,
                reasons: false,
                chunkOrigins: false,
                chunkModules: false,
                modules: false,
                children: false,
                cachedAssets: false,
                source: false,
                modulesSort: "id",
                performance: true,
                cached: true,
            },
            performance: {
                hints: false,
                assetFilter: function (assetFilename) {
                    return assetFilename.endsWith(".js");
                }
            }
        };

        if (!helper.getFile()) {
            configuration.module.rules.push(// instrumentation du code du projet en utilisant le me instrumenter que pour test:mocha
                {
                    test: new RegExp(".*\/" + project.name + "\/.+\.js$"),
                    exclude: [new RegExp(".*\/" + helper.NODE_MODULES + "\/.+$"), new RegExp("tests.webpack.js$")],
                    use: {
                        loader: path.resolve(customPreLoadersDir, 'instanbul-webpack-loader.js'),
                    }
                });
        }

        if (confKarma.browsers && confKarma.browsers[0] == "PhantomJS") {
            configuration.module.rules.push({
                test: /\.js$/,
                include: [/node_modules\/.*\/log4js\//, /node_modules\/.*\/async-listener\//],
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [path.join(__dirname, "../../../../node_modules", "babel-preset-env")]
                    }
                }
            });
        }


        // ajout des ContextReplacementPlugin
        this.buildClientContext(conf.karma, configuration);

        // ajout des externals
        this.buildExternal(conf.karma, configuration, helper);

        if (helper.isWebpackVisualizer()) {
            helper.info("Ajout de l'analyse des chunks webpack '--webpackVisualizer' a été utilisée");
            const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
            configuration.plugins.push(new BundleAnalyzerPlugin({
                reportFilename: path.resolve(path.join(project.dir, "dev", "webpack-visualizer.html")), analyzerMode: "static", openAnalyzer: false
            }));
        }

        // Webpack modules resolver
        let modulesDirectories = helper.getExternalModuleDirectories(project);
        modulesDirectories.push(project.dir);
        modulesDirectories.push(path.resolve(path.join(project.dir, helper.NODE_MODULES_TEST)));
        modulesDirectories.push(path.resolve(path.join(project.dir, helper.NODE_MODULES_APP)));
        modulesDirectories.push(path.resolve(path.join(project.dir, helper.NODE_MODULES)));
        modulesDirectories.push(helper.NODE_MODULES);
        let parentBuilderFile = path.join(project.dir, "../", helper.BUILDER_FILE);
        if (fs.existsSync(parentBuilderFile)) {
            let parentBuilderJs = require(parentBuilderFile);
            if (parentBuilderJs.type === helper.TYPE.PARENT) {
                modulesDirectories.push(path.join(project.dir, ".."));
            }
        }
        configuration.resolve["modules"] = modulesDirectories;// WP2

        // on déclare les répertoires perso à webpack
        configuration.resolve["alias"] = { "./appenders/console": path.resolve(path.join(project.dir, helper.NODE_MODULES_APP, "log4js", "lib", "appenders", "console.js")) };

        return configuration;
    }

    arrayToString(tabName, array) {

        let tabValue = "";

        array.forEach((elt) => {
            tabValue += tabName + "[]=" + elt + ","
        });

        if (tabValue.length === 0) {
            tabValue = tabName + "[]";
        } else {
            tabValue = tabValue.substr(0, tabValue.length - 1);
        }

        return tabValue;
    }
}

module.exports = RunTestKarma;