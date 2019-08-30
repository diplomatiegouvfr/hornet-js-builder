"use strict";

const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const webpack = require("webpack");
const path = require("path");
const fs = require("fs");
const map = require ("lodash.map");
const sortBy = require ("lodash.sortby");
const forEach = require ("lodash.foreach");
const jsonLoaderName = require.resolve("json-loader");
const jsxLoaderName = require.resolve("jsx-loader");
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

let exp = {};

exp.getDefaultConf = function (project, conf, helper) {

  let modulesDirectories = [];

  modulesDirectories.push(path.resolve(project.dir, conf.target.base));
  modulesDirectories.push(path.resolve(project.dir, "node_modules"));
  modulesDirectories.push("node_modules");
  modulesDirectories.push(path.resolve(path.join(__dirname, "../../../../node_modules")));

  let alias = {};
  if (conf.tscOutDir) {
    alias[project.name] = path.join(project.dir, conf.target.ts);
  }

  return {
    entry: {
      client: "./" + conf.targetClientJs
    },
    output: {
      path: path.join(project.dir, "static"),
      publicPath: "./static-" + project.packageJson.version + "/",
      filename: conf.js + "/[name].js"
    },
    resolve: {
      // you can now require("file") instead of require("file.jsx")
      alias: alias,
      extensions: [".js", ".json", ".css", ".scss", ".jsx", ".tsx", ".ts"],
      mainFields: ["webpack", "browser", "web", "browserify", "main", "module"],
      modules: modulesDirectories,
      symlinks: false
    },
    mode: "production",
    resolveLoader: {
      modules: [path.join(__dirname, "../../../../node_modules"), path.resolve(path.join(project.dir, helper.NODE_MODULES))]
    },
    node: {
      global: true,
      process: true,
      __filename: true,
      __dirname: true,
      Buffer: true,
      setImmediate: true,
      cluster: "empty",
      "child_process": "empty"
    },
    optimization: {
      minimize: true,
      noEmitOnErrors: true,
      mergeDuplicateChunks: true,
      concatenateModules: true,
      splitChunks: {
        chunks: 'all',
        minChunks: 3
      }
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: [
            {
              loader: MiniCssExtractPlugin.loader
            },
            {
              loader: "postcss-loader",
              options: { 
                ident: 'postcss',
                plugins: [
                  require('autoprefixer')({browsers: "last 2 versions" }),
                ]
              }
            },
            "css-loader"
          ]
        }
      ]
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: "css/appli.min.css"
      })
    ],
    stats: {
      assets: true,
      cached: false,
      cachedAssets: false,
      children: false,
      chunkOrigins: helper.isDebug() || false,
      chunkModules: false,
      chunks: helper.isDebug() || false,
      errors: true,
      errorDetails: true,
      colors: true,
      hash: true,
      modules: helper.isDebug() || false,
      modulesSort: "id",
      performance: true,
      publicPath: true,
      reasons: helper.isDebug() || false,
      source: false,
      timings: true,
      version: true,
      warnings: helper.isDebug() || false,
    }
  };
}

exp.addSourceMapLoader = function (project, conf, helper) {
  return {
    module: {
      rules: [
        {
          enforce: 'pre',
          test: /\.js$/,
          loader: "source-map-loader"
        }
      ]
    },
    plugins: [
    ]
  };
};

// Bundle splitting :
//    - création d'un nouveau bundle ('entry chunk')
exp.extractBundle = function (webpack, bundles, options) {
  const entry = {};
  const bundlesNname = [];

  for (let i = 0; i < bundles.length; i++) {
    let bundle = bundles[i]
    if (bundle && bundle.name) {
      entry[bundle.name] = bundle.entries;
    }
    bundlesNname.push(bundle.name);
  }

  return {
    entry,
    plugins: [
      new webpack.optimize.CommonsChunkPlugin(
        Object.assign({ names: bundlesNname }, options)
      )
    ]
  };
};

exp.splitChunks = function (webpack, bundles, options) {
  return {
    optimization: {
      splitChunks: {
        minChunks: conf.webPackMinChunks || 3,
        chunks: 'all'
      }
    }
  };
};

exp.autoCodeSplittingChunks = function (project, conf, helper) {
  var componentsDirs = arrayToString("sourcesDirs", conf.componentsDirs);
  var componentsSuffix = "-page.jsx";
  var componentsText = "// WEBPACK_AUTO_GENERATE_CLIENT_ROUTING";

  var routesDirs = arrayToString("sourcesDirs", conf.routesDirs);
  var routesSuffix = conf.routesSuffix || "-routes.js";
  var routesText = "// WEBPACK_AUTO_GENERATE_CLIENT_ROUTE_LOADING";


  const jsxLoaderDir = helper.getStringBefore(jsxLoaderName, "jsx-loader");
  helper.debug("jsxLoaderDir:", jsxLoaderDir);

  helper.debug("customPreLoadersDir:", customPreLoadersDir);
  var preLoadersTestRegex = new RegExp(conf.clientJs + "$");

  return {
    module: {
      rules: [
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
        }
      ]
    }
  };

};

exp.addJsonLoader = function (project, conf, helper) {
  const jsonLoaderDir = helper.getStringBefore(jsonLoaderName, "json-loader");
  helper.debug("jsonLoaderDir:", jsonLoaderDir);

  return {
    module: {
      rules: [
        {
          test: /\.json$/,
          loader: 'json5-loader'
        }
      ]
    }
  };

};

exp.addJsxLoader = function (project, conf, helper) {
  const jsxLoaderDir = helper.getStringBefore(jsxLoaderName, "jsx-loader");
  return {
    module: {
      rules: [
        {
          test: /(\.jsx$|rc-calendar)/,
          loader: jsxLoaderDir + "jsx-loader?harmony"
        }
      ]
    }
  };
};

exp.addScssLoader = function (project, conf, helper) {
  let use = [];
  let contextRoot;
  if (project.configJson) {
    contextRoot = project.configJson.contextPath;
  }
  let staticUrlImg = "/" + (contextRoot || project.name) + "/static-" + project.version + "/";
  if (helper.isDebug()) {
    use.push("style-loader")
  } else {
    use.push(
    { loader: MiniCssExtractPlugin.loader,
       options: { 
        hmr: true, 
        reloadAll: true, 
        outputPath: path.join(project.dir, "static", "css"),
        publicPath: "./css/"
      }
    });
  }
  
  use.push({ loader: "css-loader", options: { sourceMap: helper.isDebug() } });
  use.push({
    loader: "postcss-loader",
    options: { 
      ident: 'postcss',
      plugins: [
        require('autoprefixer')({browsers: "last 2 versions" }),
      ]
    }
  });
  try {
    require("sass-loader");
    use.push({ loader: 'sass-loader' ,
      options: {
        outputStyle: process.env.NODE_ENV !== "production" ? "expanded": "compressed",
        data: '$PATH_FONT: "' + (project.staticPath || "static") + 'fonts/"; $PATH_IMG: "' + (project.staticPath || "static") + 'img/";',
        importer: function(url, prev, done) {
            if(fs.existsSync(path.resolve(project.dir, "sass", url) + (path.extname(url) ? "" : ".scss"))) {
              return {file: path.resolve(project.dir, "sass", url) + (path.extname(url) ? "" : ".scss")};
            } else if(fs.existsSync(path.resolve(project.dir, url) + (path.extname(url) ? "" : ".scss"))) {
              return {file: path.resolve(project.dir, url) + (path.extname(url) ? "" : ".scss")};
            } else if(fs.existsSync(path.resolve(project.dir, "node_modules", url) + (path.extname(url) ? "" : ".scss"))) {
              return {file: path.resolve(project.dir, "node_modules", url) + (path.extname(url) ? "" : ".scss")};
            }
            return  {file: path.resolve(prev, "..", url)};
        }
      }

    })
  } catch (e) {
    helper.error(e);
  }

  return {
    module: {
      rules: [
        {
          test: /\.(sa|sc|c)ss$/,
          use,
        }
      ]
    }
  };
};

exp.addImageLoader = function (project, conf, helper) {
  let contextRoot;
  if (project.configJson) {
    contextRoot = project.configJson.contextPath;
  }
  let staticUrlImg = "/" + (contextRoot || project.name) + "/static-" + project.version + "/";

  return {
    module: {
      rules: [
        {
          test: /\.(jpe?g|gif|png|svg)$/,
          loader: "file-loader?name=img/[name].[ext]&publicPath=" + staticUrlImg
        }
      ]
    }
  };
};

exp.addFontLoader = function (project, conf, helper) {
  let contextRoot;
  if (project.configJson) {
    contextRoot = project.configJson.contextPath;
  }
  let staticURLFont = "/" + (contextRoot || project.name) + "/static-" + project.version + "/";

  return {
    module: {
      rules: [
        {
            test: /\.(woff|woff2|eot|ttf|otf)$/,
            loader: 'file-loader',
            options: { outputPath: "/fonts",
                       name: '[name].[ext]', 
                       publicPath: + staticURLFont + "fonts/"
            }
        }
      ]
    }
  };
};


exp.addChunkVizualizer = function (project, conf, helper) {
  return {
    plugins: [
      new BundleAnalyzerPlugin({
        analyzerMode: "static",
        reportFilename: path.join("..", "dev", "webpack-bundle-analyzer.html"),
        generateStatsFile: true,
      })
    ]
  };
};

exp.addReportFileSizePlugin = function (project, conf, helper) {
  return {
    plugins:
      [
        {
          "apply": function (compiler) {
            compiler.hooks.done.tap("Stats Plugins", function (stats) {
              var infos = stats.toJson();
              var files = map(infos.modules, function (chunk) {
                return {
                  "file": chunk.name,
                  "size": chunk.size
                }
              });
              files = sortBy(files, "size");
              forEach(files, function (chunk) {
                var fileSizeInKilobytes = Math.round(chunk.size / 1000.0);
                helper.info("[WEBPACK] [", fileSizeInKilobytes, "ko]: ", chunk.file);
              });
            });
          }
        }
      ]
  };

};

exp.addDuplicateFileLoader = function (project, conf, helper) {

  return {
    module: {
      rules: [
        {
          test: /\.js$/,
          enforce: "pre",
          loader: customPreLoadersDir + "webpack-duplicate-file-logger-processor"
        }
      ]
    }
  };
};

/**
 * Rajoute des intances de ContextReplacementPlugin dans la configuration webpack
 * @param {*} conf - L'object de configuration du builder.js
 * @param {*} webPackConfiguration - L'object de configuration webpack à enrichir
 */
exp.addConfContextReplacement = function (project, conf, helper) {
  let plugins = [];

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
exp.addContextReplacement = function (clientContext) {
  let plugins = [];
  // Activation du context
  if (clientContext && Array.isArray(clientContext)) {
    clientContext.forEach((contextElt) => {
      plugins.push(new webpack.ContextReplacementPlugin(...contextElt));
    });
  }

  return { plugins };

};

exp.addUglifyPlugins = function (project, conf, helper) {
  const TerserPlugin = require('terser-webpack-plugin');

  return {
    optimization: {
      minimizer: [new TerserPlugin({
        terserOptions: {
          sourceMap: false,
          cache: true,
          output: {
            comments: false,
          },
          keep_classnames: true,
          keep_fnames: true
        }
      })],
    },
  };
};

exp.addDllReferencePlugins = function (project, staticPath, jsPath, dllPath) {
  fs.exists(path.join(project.dir, staticPath, jsPath, dllPath + "-manifest.json"), (exist) => {
    if (exist) {
      return {
        plugins: [
          new webpack.DllReferencePlugin({
            context: path.join(project.dir, "node_modules"),
            manifest: require(path.join(project.dir, staticPath, jsPath, dllPath + "-manifest.json")),
          })
        ]
      };
    }
  });
};

exp.addGlobalPluginsOption = function (project, conf, helper) {
  return {
    plugins: [
      new webpack.LoaderOptionsPlugin({ debug: true })
    ]
  };

};

module.exports = exp;

function arrayToString(tabName, array) {

  let tabValue = "";

  array.forEach((elt) => {
    tabValue += tabName + "[]=" + elt + ","
  });

  if (tabValue.length == 0) {
    tabValue = tabName + "[]";
  } else {
    tabValue = tabValue.substr(0, tabValue.length - 1);
  }

  return tabValue;
}


var customPreLoadersDir = path.resolve(__dirname, "..", "..", "..", "webpack") + path.sep;