"use strict";
var webpack = require("webpack");
var helper = require("../helpers");
var _ = require("lodash");
var path = require("path");
var jsxLoaderName = require.resolve("jsx-loader");

const HOST_PROTOCOL = "http";
const HOST_NAME = "localhost";
const HOST_PORT = "5000";
const HOST_URI = HOST_PROTOCOL + "://" + HOST_NAME + ":" + HOST_PORT;

module.exports = {
    browser: configWebPackDevServer,
    server: {
        host: HOST_NAME,
        protocol: HOST_PROTOCOL,
        port: HOST_PORT,
        uri: HOST_URI
    }
};

function configWebPackDevServer(project, conf, debug) {

    var defaultConfiguration = require("./default-webpack-config").browser(project, conf, debug);

    var jsxLoaderDir = helper.getStringBefore(jsxLoaderName, "jsx-loader") + path.sep;

    var webPackDevConfiguration = {
        entry: {
            client: [
                'node_modules/app/webpack/hot/only-dev-server',
                "./" + conf.targetClientJs,
                "node_modules/app/webpack-dev-server/client?" + HOST_URI
            ]
        },
        devtool: "eval-cheap-module-source-map",
        output: {
            path: path.join(__dirname, 'static'),
            filename: "[name].js",
            publicPath: HOST_URI + "/static/js"
        }
    };


    var configuration = _.merge(defaultConfiguration, webPackDevConfiguration);

    // configuration.plugins.push(new webpack.HotModuleReplacementPlugin());
    configuration.plugins.push(new webpack.IgnorePlugin(/regenerator|nodent|js\-beautify/, /ajv/));
    configuration.module.loaders[0] = {
        test: /(\.jsx$|rc-calendar)/,
        loaders: [jsxLoaderDir + "jsx-loader?harmony", 'monkey-hot'],
        include: path.join(__dirname, 'src'),
        exclude: /node_modules\/app/
    };

    return configuration;
}