# Montée de version vers 2.0.0

# NPM

Il faut au minimum en npm  version 6

# Package.json

- passer les éventuelles dépendences de typage de `tsDefinitionDependencies` vers `devDependencies` sauf pour les projets hornet-js-* qui sont embarquées dans chacuns des projets, il faut ensuite adapter la configuration du transpilateur typescript (exemple [ci après](#tsconfig.json)).
- `appDependencies` devient `dependencies`
- `buildDependencies` et `testDependencies` sont à tranférer dans `devDependencies`.

# index.ts des projets

La structure du répertoire node_modules étant différente, il faut adapter le contenu de la méthode `Module._newNodeModulePaths` comme dans l'exemple suivant :

```javascript
// Bootstrap de lancement de l'application
// permet la résolution de modules dans des répertoires autres que "node_modules"
var Module = require("module").Module;
import * as fs from "fs";
import * as path from "path";


const appDirectory = process.cwd();
// On conserve la méthode originale pour rétablir le fonctionnement normal en cas d'un requireGlobal
Module._oldNodeModulePaths = Module._nodeModulePaths;

const NODE_MODULES = "node_modules";

Module.prototype._oldCompile = Module.prototype._compile;
Module.prototype._compile = function(content, filename) {
    if ((path.extname(filename) === ".scss") || (path.extname(filename) === ".svg")) {
        content = "module.exports = {};";
    }
    return this._oldCompile(content, filename);
};


// on surcharge la méthode de résolution interne nodejs pour gérer d'autres répertoires
Module._newNodeModulePaths = function(from) {
    var paths = Module._oldNodeModulePaths.call(this, from);
    paths.push(path.join(appDirectory));
    paths.push(path.join(appDirectory, NODE_MODULES));

    let modulePath = from
    do {
        if (fs.existsSync(path.join(modulePath, NODE_MODULES))) {
            paths.push(path.join(modulePath, NODE_MODULES));
        }
        modulePath = path.dirname(modulePath)
    } while (modulePath.length > 1)
    return paths;
};
Module._nodeModulePaths = Module._newNodeModulePaths;


////////////////////////////////////////////////////////////////////////////////////////////////////
// Gestion du cas particulier du main (car nodejs le considère différent des autres modules ...)  //
require.main.paths = [];
require.main.paths.push(path.join(process.cwd()));
require.main.paths.push(path.join(process.cwd(), NODE_MODULES));

////////////////////////////////////////////////////////////////////////////////////////////////////
// gestion des sourcemap dans les stack nodejs
require("source-map-support").install();

// autorise le format json5 dans les extensions .json
import { JSONLoader } from "hornet-js-utils/src/json-loader";
JSONLoader.allowJSON5();

// auto configuration des logs server
import { ServerLogConfigurator } from "hornet-js-core/src/log/server-log-configurator";
ServerLogConfigurator.configure();


// ================================================
// Configuration de L'appli selon l'environnement
// ================================================
const environnement = process.env.NODE_CONFIG_ENV || 'development';
console.info(`Starting prevoirh in [${ environnement }] mode`);
const configsPath = `_onePoint/configs/${ environnement }`;
if (fs.existsSync(configsPath)) {
    // Installation des certificats selon l'environnement
    fs.copyFileSync(`${ configsPath }/cert.pem`, `config/idp/cert.pem`);
    fs.copyFileSync(`${ configsPath }/key.pem`, `config/idp/key.pem`);
}

// initialisation des infos de l'application courante
import { AppSharedProps } from "hornet-js-utils/src/app-shared-props";
import { Utils } from "hornet-js-utils";

var packageJson = require("./package");
AppSharedProps.set("appName", packageJson.name);
AppSharedProps.set("appVersion", packageJson.version);
AppSharedProps.set("appDescription", packageJson.description);
AppSharedProps.set("appAuthor", packageJson.author);
AppSharedProps.set("sessionTimeout", Utils.config.get("server.sessionTimeout"));
AppSharedProps.set("notifSessionTimeout", Utils.config.get("server.notifications.sessionTimeoutDelay"));

// ==============================
// Configuration de Moment
// ==============================

import moment = require('moment');

// On configure le serveur sur l'heure de Paris
(moment as any).tz.setDefault('Europe/Paris');

import { Server } from "src/server";
Server.startApplication();
```

# builder.js

variabilisez la configuration clientContext et remplacez le:

```javascript
const clientContext = [
    [/moment[\/\\]locale$/, /fr|en/],
    [/intl[\/\\]locale-data[\/\\]jsonp$/, /fr|en/],
    [/^\.$/, (context) => {
        if (!/\/locale-data\//.test(context.context)) console.log("locale-daa", context);
        if (!/\/log4js\/lib$/.test(context.context)) return;
        context.regExp = /^\.\/appenders\/console.*$/;
        context.request = ".";
    }]
];
[...]
clientContext: clientContext,
```

Retirez : helper.excludeNodeModulesFromWebpack et dev

Pour plus de clareté, il est possible et conseillé de déplacer la configuration webpack et karma en dehors du fchier `builder.js`, dans des fichiers séparés (cf documentation builder chapitre 'Configuration webpack' et 'Configuration karma'), voici un exemple possible :

ficher `webpack.addons.config.js` à la racine du projet, avec le contenu suivant :

```javascript
const path = require("path");

const clientContext = [
    [/moment[\/\\]locale$/, /fr|en/],
    [/intl[\/\\]locale-data[\/\\]jsonp$/, /((fr)|(en))$/],
    [/^\.$/, (context) => {
        if (!/\/log4js\/lib\/appenders$/.test(context.context)) return;
        Object.assign(context, {
            regExp: /^console.*$/,
            request: "."
        });
        
    }]
];

const dev = {
    dllEntry: {
        vendor: ["hornet-js-react-components", "hornet-js-components", "hornet-js-utils", "hornet-js-core"]
    }
}

const externals = [
        new RegExp(path.join("src", "services", "data") + "/.*"),
        new RegExp(path.join("src", "dao") + "/.*"),
        /src\/middleware\/.*/,
        new RegExp(path.join("src", "services", "data") + "/.*-data-\.*"),
        "hornet-js-database",
        "config",
        "continuation-local-storage",
        "sequelize",
        "pdfmake",
        "carbone",
        "csv-parser",
        "nodemailer",
        "tls",
        "child_process",
        "net",
        "fs",
        "dns"
]

module.exports = (project, conf, helper, webpackConfigPart, configuration, webpack) => {
    const projectPlugins = [...webpackConfigPart.addContextReplacement(clientContext).plugins];
    if (helper.isDevMode()) {
        conf.dev = dev;
        const dllReference =  webpackConfigPart.addDllReferencePlugins(project, "static", "js", "dll");
        if(dllReference && dllReference.plugins) {
            projectPlugins.push(...dllReference.plugins);
        }
    }
    return {
        ...configuration,
        plugins: [...configuration.plugins, ...projectPlugins,
        ],
        externals : (context, request, callback) => {
                if(/log4js\/lib\/appenders/.test(context) && (!/console/.test(request)) && (/^\.\//.test(request))) {
                    return callback(null, "{}");
                } 
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
            },
            optimization: {
                splitChunks: {
                    chunks: 'all',
                    minChunks: 3,
                    minSize: 3000000
                },
            },
            watchOptions: {
                aggregateTimeout: 3000
            }
    }

}
```

<a name="#tsconfig.json"></a>
# tsconfig.json

``` JSON
{
  "compilerOptions": {
    "baseUrl": "./",
    "emitDecoratorMetadata": true,
    "esModuleInterop": false,
    "experimentalDecorators": true,
    "importHelpers": true,
    "jsx": "react",
    "module": "commonjs",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "target": "ES5",
    "preserveSymlinks": true
  },
  "include": [
    "index.ts",
    "src/**/*.ts*",
    "test/**/*.ts*",
    "./node_modules/hornet-js-bean/index.d.ts",
    "./node_modules/hornet-js-components/index.d.ts",
    "./node_modules/hornet-js-core/index.d.ts",
    "./node_modules/hornet-js-database/index.d.ts",
    "./node_modules/hornet-js-logger/index.d.ts",
    "./node_modules/hornet-js-utils/index.d.ts",
    "./node_modules/hornet-js-passport/index.d.ts",
    "./node_modules/hornet-js-react-components/index.d.ts",
    "./node_modules/hornet-js-test/index.d.ts"
  ],
  "exclude": [
    "istanbul"
  ]
}
```
