"use strict";
var webpack = require("webpack");
var helper = require("../helpers");
var _ = require("lodash");
var path = require("path");
var jsonLoaderName = require.resolve("json-loader");
var jsxLoaderName = require.resolve("jsx-loader");
var HornetModulesInDirectoriesPlugin = require("./hornetModulesInDirectoriesPlugin");

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
    var componentsDir = path.join("..", conf.src);
    var componentsSuffix = "-page.jsx";
    var componentsText = "// WEBPACK_AUTO_GENERATE_CLIENT_ROUTING";

    var routesDir = "." + path.sep + "routes";
    var routesSuffix = "-routes.js";
    var routesText = "// WEBPACK_AUTO_GENERATE_CLIENT_ROUTE_LOADING";

    var commonsPluginOptions = {
        name: "client",
        // (the commons chunk name)
        minChunks: conf.webPackMinChunks || 3,
        // (Modules must be shared between 2 entries)
        children: true
    };

    var commonsPlugin = new webpack.optimize.CommonsChunkPlugin(commonsPluginOptions);

    var jsonLoaderDir = helper.getStringBefore(jsonLoaderName, "json-loader") + path.sep;
    helper.debug("jsonLoaderDir:", jsonLoaderDir);
    var jsxLoaderDir = helper.getStringBefore(jsxLoaderName, "jsx-loader") + path.sep;
    helper.debug("jsxLoaderDir:", jsxLoaderDir);

    var preLoadersTestRegex = new RegExp(conf.clientJs + "$");

    var customPreLoadersDir = path.resolve(__dirname, "..", "webpack") + path.sep;
    helper.debug("customPreLoadersDir:", customPreLoadersDir);

    var configuration = {
        entry: {
            client: "./" + conf.targetClientJs
        },
        output: {
            publicPath: "./static/" + conf.js + "/",
            filename: "[name].js"
        },
        module: {
            loaders: [{
                test: /(\.jsx$|rc-calendar)/,
                loader:  jsxLoaderDir + "jsx-loader?harmony"
            }, {
                test: /\.json$/,
                loader: jsonLoaderDir + "json-loader"
            }],
            preLoaders: [
                {
                    // Permet d"ajouter le chargement asynchrone des composants dans client.js
                    test: preLoadersTestRegex,
                    loader: customPreLoadersDir + "webpack-component-loader-processor?sourcesDir=" + componentsDir
                    + "&fileSuffix=" + componentsSuffix + "&replaceText=" + componentsText
                },
                {
                    // Permet d"ajouter le chargement asynchrone des routes dans client.js
                    test: preLoadersTestRegex,
                    loader: customPreLoadersDir + "webpack-component-loader-processor?sourcesDir=" + routesDir
                    + "&fileSuffix=" + routesSuffix + "&replaceText=" + routesText
                },
                {
                    test : /\.js$/,
                    loader: "source-map"
                }
            ]
        },
        resolve: {
            root: project.dir,
            fallback: [path.join(project.dir, helper.NODE_MODULES)],
            // you can now require("file") instead of require("file.jsx")
            extensions: ["", ".js", ".json", ".jsx"]
        },
        resolveLoader: {
            modulesDirectories: [path.join(__dirname, "../../node_modules"), path.resolve(path.join(project.dir, helper.NODE_MODULES_TEST))]
        },
        devtool: "#source-map",
        plugins: [commonsPlugin, new webpack.NoErrorsPlugin()/*, new webpack.EnvironmentPlugin(["NODE_ENV"])*/],
        minifiedPlugin: new webpack.optimize.UglifyJsPlugin({
            compress: {
                warnings: false
            }
        }),
        debug: debug,
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
    modulesDirectories.push(path.resolve(path.join(project.dir, helper.NODE_MODULES_APP)));
    modulesDirectories.push(path.resolve(path.join(project.dir, helper.NODE_MODULES)));
    modulesDirectories.push(helper.NODE_MODULES);

    // on déclare les répertoires perso à webpack
    configuration.resolve["modulesDirectories"] = modulesDirectories;

    // resolver hornet afin de sécuriser les require du style require("src/monModule")
    configuration.plugins.splice(0, 0, new webpack.ResolverPlugin([new HornetModulesInDirectoriesPlugin("module", modulesDirectories)]));

    //configuration.plugins.splice(1, 0, new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /fr|en/));
    //A priori provoque plus de bugs qu"il n"en résoud
    //configuration.plugins.push(new webpack.optimize.DedupePlugin());

    if (conf.webPackLogAddedFiles === true) {
        configuration.module.preLoaders.push(
            {
                // Permet de logger tous les fichiers ajoutés
                test: /.*/,
                loader: customPreLoadersDir + "webpack-duplicate-file-logger-processor"
            });
    }

    if (helper.isShowWebPackFiles()) {
        configuration.plugins.push(reportFileSizePlugin);
    }

    helper.debug("Configuration de webpack:", configuration);
    return configuration;
}
