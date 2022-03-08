const fs = require("fs");
const path = require("path");
const forEach = require("lodash.foreach");
const map = require("lodash.map");
const sortBy = require("lodash.sortby");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const webpack = require("webpack");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const DependencyAnalyzerPlugin = require("../../../webpack/dependency-analyzer-plugin");

const jsxLoaderName = require.resolve("jsx-loader");
const customPreLoadersDir = path.resolve(__dirname, "..", "..", "..", "webpack") + path.sep;

const exp = {};

exp.getDefaultConf = (project, conf, helper, buildDirectory) => {
    const modulesDirectories = [];
    modulesDirectories.push(path.resolve(project.dir, buildDirectory || conf.target.base));
    modulesDirectories.push(path.resolve(project.dir, buildDirectory || conf.target.base, "node_modules"));
    modulesDirectories.push("node_modules");

    const modulesResolverDirectories = [];
    modulesResolverDirectories.push(path.resolve(project.dir, buildDirectory || conf.target.base, "node_modules"));
    modulesResolverDirectories.push("node_modules");
    modulesResolverDirectories.push(path.join(__dirname, "../../../../node_modules"));
    modulesResolverDirectories.push(path.join(__dirname, "../../../webpack"));

    const alias = {};
    if (conf.tscOutDir && !buildDirectory) {
        alias[project.name] = path.join(project.dir, conf.target.ts);
    }

    return {
        entry: {
            client: conf.targetClientJs,
        },
        output: {
            path: path.join(buildDirectory || path.join(project.dir, conf.tscOutDir || ""), "static"),
            publicPath: `${project.staticPath || "static"}`,
            filename: `${conf.js}/[name].js`,
        },
        resolve: {
            alias,
            extensions: [".js", ".json", ".css", ".scss", ".jsx", ".tsx", ".ts"],
            mainFields: ["webpack", "browser", "web", "browserify", "main", "module"],
            modules: modulesDirectories,
            symlinks: false,
        },
        mode: "production",
        resolveLoader: {
            modules: modulesResolverDirectories,
        },
        optimization: {
            minimize: true,
            noEmitOnErrors: true,
            mergeDuplicateChunks: true,
            concatenateModules: true,
            splitChunks: {
                chunks: "all",
                minChunks: 3,
            },
        },
        module: {
            rules: [],
        },
        plugins: [
            new MiniCssExtractPlugin({
                filename: `${conf.css}/appli.min.css`,
            }),
        ],
        stats: {
            assets: true,
            cached: false,
            cachedAssets: false,
            errors: true,
            errorDetails: true,
            colors: true,
            hash: true,
            children: false,
            modules: helper.isDebug() || false,
            modulesSort: "id",
            performance: true,
            publicPath: true,
            reasons: helper.isDebug() || false,
            source: false,
            timings: true,
            version: true,
            warnings: true,
            warningsFilter: [
                (warning) => {
                    return warning.indexOf("require.main.require is not supported by webpack") > -1;
                },
            ],
        },
    };
};

exp.addSourceMapLoader = () => {
    return {
        module: {
            rules: [
                {
                    enforce: "pre",
                    test: /\.js$/,
                    loader: "source-map-loader",
                },
            ],
        },
        plugins: [],
    };
};

exp.autoCodeSplittingChunks = (project, conf, helper) => {
    const componentsDirs = arrayToString("sourcesDirs", conf.componentsDirs);
    const componentsSuffix = "-page.jsx";
    const componentsText = "// WEBPACK_AUTO_GENERATE_CLIENT_ROUTING";

    const routesDirs = arrayToString("sourcesDirs", conf.routesDirs);
    const routesSuffix = conf.routesSuffix || "-routes.js";
    const routesText = "// WEBPACK_AUTO_GENERATE_CLIENT_ROUTE_LOADING";

    const jsxLoaderDir = helper.getStringBefore(jsxLoaderName, "jsx-loader");
    helper.debug("jsxLoaderDir:", jsxLoaderDir);

    helper.debug("customPreLoadersDir:", customPreLoadersDir);
    const preLoadersTestRegex = new RegExp(`${conf.clientJs}$`);

    return {
        module: {
            rules: [
                {
                    // Permet d"ajouter le chargement asynchrone des composants dans client.js
                    test: preLoadersTestRegex,
                    enforce: "pre",
                    loader: `${customPreLoadersDir}webpack-component-loader-processor?${componentsDirs}&fileSuffix=${componentsSuffix}&replaceText=${componentsText}`,
                },
                {
                    // Permet d"ajouter le chargement asynchrone des routes dans client.js
                    test: preLoadersTestRegex,
                    enforce: "pre",
                    loader: `${customPreLoadersDir}webpack-component-loader-processor?${routesDirs}&fileSuffix=${routesSuffix}&replaceText=${routesText}`,
                },
            ],
        },
    };
};

exp.addJsxLoader = (project, conf, helper) => {
    const jsxLoaderDir = helper.getStringBefore(jsxLoaderName, "jsx-loader");
    return {
        module: {
            rules: [
                {
                    test: /(\.jsx$|rc-calendar)/,
                    loader: `${jsxLoaderDir}jsx-loader?harmony`,
                },
            ],
        },
    };
};

exp.addScssLoader = (project, conf, helper) => {
    const use = [];

    if (helper.isDebug()) {
        use.push("style-loader");
    } else {
        use.push({
            loader: MiniCssExtractPlugin.loader,
            options: {
                hmr: true,
                reloadAll: true,
                outputPath: "./css",
            },
        });
    }

    use.push({ loader: "css-loader", options: { sourceMap: helper.isDebug() } });
    use.push({
        loader: "postcss-loader",
        options: {
            postcssOptions: {
                ident: "postcss",
                plugins: [require("autoprefixer")({ overrideBrowserslist: "last 2 versions" })],
                hideNothingWarning: true,
            },
        },
    });

    try {
        require("sass-loader");
        use.push({
            loader: "sass-loader",
            options: {
                outputStyle: process.env.NODE_ENV !== "production" ? "expanded" : "compressed",
                data: `$PATH_FONT: "${project.staticPath || "static"}fonts/"; $PATH_IMG: "${project.staticPath || "static"}img/";`,
            },
        });
    } catch (e) {
        helper.error(e);
    }

    return {
        module: {
            rules: [
                {
                    test: /\.(sa|sc|c)ss$/,
                    use,
                },
            ],
        },
    };
};

exp.addImageLoader = () => {
    return {
        module: {
            rules: [
                {
                    test: /\.(jpe?g|gif|png|svg)$/,
                    loader: "file-loader",
                    options: {
                        outputPath: "./img",
                        name: "[name].[ext]",
                    },
                },
            ],
        },
    };
};

exp.addFontLoader = () => {
    return {
        module: {
            rules: [
                {
                    test: /\.(woff|woff2|eot|ttf|otf)$/,
                    loader: "file-loader",
                    options: {
                        outputPath: "./fonts",
                        name: "[name].[ext]",
                    },
                },
            ],
        },
    };
};

exp.addChunkVizualizer = () => {
    return {
        plugins: [
            new BundleAnalyzerPlugin({
                analyzerMode: "static",
                reportFilename: path.join("..", "dev", "webpack-bundle-analyzer.html"),
                generateStatsFile: true,
            }),
        ],
    };
};

exp.addDependencyAnalyzerPlugin = (project, conf, helper, options) => {
    return {
        plugins: [new DependencyAnalyzerPlugin(options)],
    };
};

exp.addReportFileSizePlugin = (project, conf, helper) => {
    return {
        plugins: [
            {
                apply(compiler) {
                    compiler.hooks.done.tap("Stats Plugins", (stats) => {
                        const infos = stats.toJson();
                        let files = map(infos.modules, (chunk) => {
                            return {
                                file: chunk.name,
                                size: chunk.size,
                            };
                        });
                        files = sortBy(files, "size");
                        forEach(files, (chunk) => {
                            const fileSizeInKilobytes = Math.round(chunk.size / 1000.0);
                            helper.info("[WEBPACK] [", fileSizeInKilobytes, "ko]: ", chunk.file);
                        });
                    });
                },
            },
        ],
    };
};

/**
 * Rajoute des intances de ContextReplacementPlugin dans la configuration webpack
 * @param {*} conf - L'object de configuration du builder.js
 * @param {*} webPackConfiguration - L'object de configuration webpack à enrichir
 */
exp.addConfContextReplacement = (project, conf) => {
    const plugins = [];

    // Activation du context
    if (conf.clientContext && Array.isArray(conf.clientContext)) {
        conf.clientContext.forEach((contextElt) => {
            plugins.push(new webpack.ContextReplacementPlugin(...contextElt));
        });
    }

    return { plugins };
};

/**
 * Rajoute des intances de ContextReplacementPlugin dans la configuration webpack
 * @param {Array} clientContext - la liste de contextes à ajouter
 */
exp.addContextReplacement = (clientContext) => {
    const plugins = [];
    // Activation du context
    if (clientContext && Array.isArray(clientContext)) {
        clientContext.forEach((contextElt) => {
            plugins.push(new webpack.ContextReplacementPlugin(...contextElt));
        });
    }

    return { plugins };
};

exp.addUglifyPlugins = () => {
    const TerserPlugin = require("terser-webpack-plugin");

    return {
        optimization: {
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        sourceMap: false,
                        cache: true,
                        output: {
                            comments: false,
                        },
                        keep_classnames: true,
                        keep_fnames: true,
                    },
                }),
            ],
        },
    };
};

exp.addDllReferencePlugins = (project, staticPath, jsPath, dllPath) => {
    if (fs.existsSync(path.join(project.dir, staticPath, jsPath, dllPath, "manifest.json"))) {
        return {
            plugins: [
                new webpack.DllReferencePlugin({
                    context: path.join(project.dir, "node_modules"),
                    manifest: require(path.join(project.dir, staticPath, jsPath, dllPath, "manifest.json")),
                }),
            ],
        };
    }
    return {};
};

module.exports = exp;

function arrayToString(tabName, array) {
    let tabValue = "";

    array.forEach((elt) => {
        tabValue += `${tabName}[]=${elt},`;
    });

    if (tabValue.length === 0) {
        tabValue = `${tabName}[]`;
    } else {
        tabValue = tabValue.substr(0, tabValue.length - 1);
    }

    return tabValue;
}
