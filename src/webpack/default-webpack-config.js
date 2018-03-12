"use strict";
var webpack = require("webpack");
var helper = require("../helpers");
var _ = require("lodash");
var path = require("path");
var jsonLoaderName = require.resolve("json-loader");
var jsxLoaderName = require.resolve("jsx-loader");
var HornetModulesInDirectoriesPlugin = require("./hornet-modules-in-directories-plugin");
var fs = require("fs");
const configParts = require('../builders/configuration/webpack/config-parts');
const State = require("../builders/state");
const ExtractTextPlugin = require('extract-text-webpack-plugin');


module.exports = {
    browser: configBrowser
};

var reportFileSizePlugin = {
    "apply": function (compiler) {
        compiler.plugin("done", function (stats) {
            var infos = stats.toJson();
            var files = _.map(infos.modules, function (chunk) {
                return {
                    "file": chunk.name,
                    "size": chunk.size
                }
            });
            files = _.sortBy(files, "size");
            _.forEach(files, function (chunk) {
                var fileSizeInKilobytes = Math.round(chunk.size / 1000.0);
                helper.info("[WEBPACK] [", fileSizeInKilobytes, "ko]: ", chunk.file);
            });
        });
    }
};


function configBrowser(project, conf, debug) {
    var componentsDirs = arrayToString("sourcesDirs", conf.componentsDirs);
    var componentsSuffix = "-page.jsx";
    var componentsText = "// WEBPACK_AUTO_GENERATE_CLIENT_ROUTING";

    var routesDirs = arrayToString("sourcesDirs", conf.routesDirs);
    var routesSuffix = "-routes.js";
    var routesText = "// WEBPACK_AUTO_GENERATE_CLIENT_ROUTE_LOADING";

    let contextRoot;
    if (require(project.configJsonPath)) {
        contextRoot = require(project.configJsonPath).contextPath;
    }

    var commonsPluginOptions = {
        name: "client",
        // (the commons chunk name)
        minChunks: conf.webPackMinChunks || 3,
        // (Modules must be shared between 2 entries)
        children: true
    };

    var commonsPlugin = new webpack.optimize.CommonsChunkPlugin(commonsPluginOptions);

    var jsonLoaderDir = helper.getStringBefore(jsonLoaderName, "json-loader") ;
    helper.debug("jsonLoaderDir:", jsonLoaderDir);
    var jsxLoaderDir = helper.getStringBefore(jsxLoaderName, "jsx-loader") ;
    helper.debug("jsxLoaderDir:", jsxLoaderDir);

    var preLoadersTestRegex = new RegExp(conf.clientJs + "$");

    var customPreLoadersDir = path.resolve(__dirname, "..", "webpack") + path.sep;
    helper.debug("customPreLoadersDir:", customPreLoadersDir);

    var webpackPlugin = [/*commonsPlugin,*/ new webpack.NoErrorsPlugin()/*, new webpack.EnvironmentPlugin(["NODE_ENV"])*/, new ExtractTextPlugin('../css/[name].css')]

    if (helper.isWebpackVisualizer()) {
        helper.info("Ajout de l'analyse des chunks webpack '--webpackVisualizer' a été utilisée");
        var Visualizer = require("webpack-visualizer-plugin");
        webpackPlugin.push(new Visualizer({
            filename: "./dev/webpack-visualizer.html"
        }));
    }

    let staticUrlImg = "/" + (contextRoot || project.name) + "/static-" + project.version + "/";
    // if(process.env.NODE_ENV != "production") {
    //     staticUrlImg = "/" + (contextRoot || project.name) + "/static/";
    // }


    var configuration = {
        entry: {
            client: "./" + conf.targetClientJs
        },
        output: {
            path: path.join(project.dir, "static") ,
            publicPath: "./static-" + project.packageJson.version + "/",
            filename: conf.js + "/[name].js"
        },
        module: {
            rules: [
                {
                    test: /(\.jsx$|rc-calendar)/,
                    loader:  jsxLoaderDir + "jsx-loader?harmony"
                }, {
                    test: /\.json$/,
                    loader: jsonLoaderDir + "json-loader"
                },
                {
                    // Permet d"ajouter le chargement asynchrone des composants dans client.js
                    test: preLoadersTestRegex,
                    enforce: "pre",
                    loader: customPreLoadersDir + "webpack-component-loader-processor?" + componentsDirs
                    + "&fileSuffix=" + componentsSuffix + "&replaceText=" + componentsText
                },
                {
                    // Permet d"ajouter le chargement asynchrone des routes dans client.js
                    test: preLoadersTestRegex,
                    enforce: "pre",
                    loader: customPreLoadersDir + "webpack-component-loader-processor?" + routesDirs
                    + "&fileSuffix=" + routesSuffix + "&replaceText=" + routesText
                },
                {
                    enforce: 'pre',
                    test: /\.js$/,
                    loader: "source-map-loader"
                }, {
                    test: /\.css$/,
                    //use: [ 'style-loader', 'css-loader' ]
                    use: ExtractTextPlugin.extract({
                        fallback: "style-loader",
                        use: "css-loader"
                    })
                }, {
                    test: /\.(jpe?g|gif|png)$/,
                    loader: "file-loader?name=img/[name].[ext]&publicPath=" + staticUrlImg
                }
            ]
        },
        resolve: {
            // you can now require("file") instead of require("file.jsx")
            extensions: [".js", ".json", ".jsx", ".tsx", ".css"],
            mainFields: ["webpack", "browser", "web", "browserify", "main", "module"]
        },
        resolveLoader: {
            modules: [path.join(__dirname, "../../node_modules"), path.resolve(path.join(project.dir, helper.NODE_MODULES_BUILD))]
        },
        devtool: "source-map",
        plugins: webpackPlugin,
        stats: {
            colors: true,
            hash: true,
            version: true,
            timings: true,
            publicPath: true,
            assets: true,
            chunks: debug || false,
            errors: true,
            errorDetails: true,
            warnings: debug || false,
            reasons: debug || false,
            chunkOrigins: debug || false,
            chunkModules: false,
            modules: debug || false,
            children: false,
            cached: false,
            cachedAssets: false,
            source: false,
            modulesSort: "id"
        }
    };


    // Webpack modules resolver
    var modulesDirectories = helper.getExternalModuleDirectories(project);
    modulesDirectories.push(project.dir);
    modulesDirectories.push(path.resolve(path.join(project.dir, helper.NODE_MODULES_APP)));
    modulesDirectories.push(path.resolve(path.join(project.dir, helper.NODE_MODULES)));
    modulesDirectories.push(helper.NODE_MODULES);
    let parentBuilderFile = path.join(project.dir, "../", helper.BUILDER_FILE)
    if (fs.existsSync(parentBuilderFile)) {
        let parentBuilderJs = require(parentBuilderFile);
        if (parentBuilderJs.type === helper.TYPE.PARENT) {
            modulesDirectories.push(path.join(project.dir, "../"));
        }    
    }

    // on déclare les répertoires perso à webpack
    configuration.resolve["modules"] = modulesDirectories;// WP2

    // resolver hornet afin de sécuriser les require du style require("src/monModule")
    //WP 2 configuration.plugins.splice(0, 0, [new HornetModulesInDirectoriesPlugin("module", modulesDirectories)]);

    if (conf.webPackLogAddedFiles === true) {
        configuration.module.rules.push(
            {
                // Permet de logger tous les fichiers ajoutés
                test: /\.js$/,
                enforce: "pre",
                loader: customPreLoadersDir + "webpack-duplicate-file-logger-processor"
            });
    }

    if (helper.isShowWebPackFiles()) {
        configuration.plugins.push(reportFileSizePlugin);
    }

    helper.debug("Configuration de webpack:", configuration);
    return configuration;
}

function arrayToString(tabName, array) {

    let tabValue = "";

    array.forEach((elt) => {
        tabValue += tabName + "[]=" + elt + ","
    });

    if(tabValue.length == 0) {
        tabValue = tabName + "[]";
    } else {
        tabValue = tabValue.substr(0, tabValue.length -1);
    }

    return tabValue;
}
