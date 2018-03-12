# hornet-js-builder

`hornet-js-builder` a été développé dans le but premier de masquer la complexité des différentes tâches nécessaires à la construction d'un projet. Son second objectif est d'accompagner le développeur en lui fournissant des outils tout au long du developpement d'un projet.

A cet effet, il surcharge les librairies `gulp` et `npm` pour fournir des tâches se rapprochant de la philosophie `maven` ainsi que des utilitaires pour simplifier et pérenniser la gestion des dépendances.

Les versions de chaque dépendance déclarée doivent également être fixes (sans ^, ~ ou *) afin de pérenniser les versions.

## Installation

### Depuis NPM

```shell

npm install -g hornet-js-builder

```

s'assurer que les liens symboliques `hornetbuilder` et `hb` ont bien été crées dans le répertoire "~/bin". Si ce n'est pas le cas:

se positionner dans le répertoire "~/bin", puis:

```shell

ln -s ${cheminAccesHornetBuilderInstalléDansNode}/bin/builder-cli.js hb
ln -s ${cheminAccesHornetBuilderInstalléDansNode}/bin/builder-cli.js hornetbuilder

```

### Depuis les sources

Installer `hornet-js-builder` de manière globale:

- Se placer dans le dossier de *hornet-js-builder*
- Lancer la commande

```shell
npm install -g
```

 ### Note

En cas de MAJ à partir d'une version antérieure de `hornet-js-builder`: supprimer les dossiers `node_modules` de chaque projet

 ### Commandes

Suite à cette installation, les commandes `hornetbuilder` et `hb` (alias de la première) sont accessibles en globale dans les scripts

## Principe de gestion des dépendances

Le builder organise les dépendances de manière "flat" et gère la transitivité des dépendances.

Il impose la déclaration de dépendance en version fixe (sans ^, ~ ou *) afin de pérenniser les versions.

Il impose également une structure du fichier `package.json légèrement différente de celle par défaut :

- Les dépendances applicatives normalement définies au moyen de la clé `dependencies` doivent impérativement être définies dans la clé `appDependencies`
- Les dépendances de construction normalement définies au moyen de la clé `devDependencies` doivent impérativement être définies dans la clé `buildDependencies`
- Les dépendances de test normalement définies au moyen de la clé `devDependencies` doivent impérativement être définies dans la clé `testDependencies`

Afin que les dépendances applicatives et les dépendances de construction/test ne rentrent pas en conflit, les dépendances sont installées dans deux répertoires différents à l'intérieur du répertoire `node_modules` :

- appDependencies
- buildDependencies
- testDependencies

Pour que le serveur nodejs sache lire les dépendances dans ce nouveau répertoire `node_modules/app` un fichier "bootstrap" nommé `index.ts` permet de démarrer le serveur.

Lorsque le builder détecte par transitivité une dépendance dont la version n'est pas fixe (ex: ^3.0.0), il récupère la dernière version correspondante sur le repository courant et la fixe dans un objet `____HORNET-BUILDER____DO_NOT_MODIFY_THIS_OBJECT____` qui est sauvegardé à la fin du fichier `package.json`.
**Cet objet ne doit surtout pas être modifié manuellement !!**

Exemple d'un fichier `package.json` complet avec version fixée par le builder :

```json
{
  "name": "applitutoriel",
  "version": "5.1.X",
  "main": "index.js",
  "description": "Application tutoriel utilisant le Framework hornet 5.1.X",
  "tsDefinitionDependencies": {
  	...
  },
  "appDependencies": {
    ...
  },
  "buildDependencies": {
    ...
  },
  "testDependencies": {
    ...
  },
  "author": "MEAE - Ministère de l'Europe et des Affaires étrangères",


  "____HORNET-BUILDER____DO_NOT_MODIFY_THIS_OBJECT____": {
    "current": "b9265f7937e0a4a52491f52fe18fe26a537052e8",
    "history": {
      "b9265f7937e0a4a52491f52fe18fe26a537052e8": {
        "version": "5.1.X",
        "date": "2017-03-09T10:02:18.543Z",
        "deps": {"amdefine":"X.X.X",...}
      }
    }
  }
}
```

## Utiliser hornetbuilder en ligne de commandes

- Ouvrir une invite de commande et se placer dans le dossier du projet.

Exemple:

```shell
cd D:\dev\workspace\applitutoriel\applitutoriel-js
```

- Taper la commande `hornetbuilder` (ou `hb`) suivi de la tâche à exécuter. Exemple:

```shell
hb test
```

Une aide est fournie en tapant la commande

```shell
hb --help
```

 Les options suivantes sont alors proposées:

| Option | Rôle |
| ------ | ---- |
| -V, --version | Affiche la version du builder |
| -d, --debug | Active les messages de logs du builder en mode debug |
| -D, --docker [options]' | Exécute les commandes du Builder dans le container Docker nodeJS |
| --show-webpack-files | Active le listing des fichiers embarqués par webpack lors de la construction du bundle de fichiers clients. Note: Les fichiers sont triés par taille croissante |
| --webpackVisualizer | Visualisation de la répartition des sources projets et node modules dans un chart, /static/dev/webpack-visualizer.html |
| -i, --ide | Indique que c'est l'IDE qui gère la compilation des fichiers .ts, .d.ts et .map. Dans ce mode la compilation des fichiers TypeScripts est désactivée ainsi que les watchers associés. De même, la tâche clean ne supprime plus ces fichiers. <br /> Cette option doit être utilisée dès lors qu'un IDE est lancé sur les projets |
| -r, --registry <URL> | Permet d'utiliser un repository spécifique. Par défaut le repository défini dans le fichier `.npmrc` est utilisé |
| --publish-registry <URL> | Permet de spécifier un repository npm spécifique pour la publication autre que celui par défaut. Par défaut le repository défini dans le fichier `.npmrc` est utilisé |
| -f, --force | Permet de forcer la mise à jour des dépendances |
| --ignoreApp | ne prend pas la version de dépendance applicative, mais la plus récente |
| --skipTests | Permet de ne pas exécuter les tests si ceux-ci doivent être exécutés (ex: tâche `package`) |
| --stopOnError | Permet de stopper toutes les tâches sur une erreur dans les tests |
| --skipMinified | Permet de ne pas minifier les chuncks |
| --noWarn | Permet de ne pas afficher les warning |
| -p, --debugPort <port> | Indique le port utilisé par node pour permettre la connexion d'un debugger externe" |
| --lintRules | Indique un fichier de rules `tslint.json` autre que celui utilisé par le builder |
| --lintReport | Indique le format de sortie pour tslint : `prose` (défaut), `json`, `verbose`, `full`, `msbuild` |
| --file | Indique le chemin d'un fichier |
| --dev | active le mode developpement | 
| --offline | active le mode offline pour la récupération des dépendances, ex : coupure réseau. Prerequis avoir les node_modules, ajouter fetch-retries=0 dans .npmrc |
| --versionFix | Indique la version ou suffixe si commence par '-', '.' ou si null calcule un suffixe avec timestamp. |      
| --versionSearch | préfixe de la dernière version"|


## Configurer un projet pour utiliser hornetbuilder

### Fichier de configuration des dépendances : `package.json`

#### Les dépendances du builder

cf : Principe de gestion des dépendances

Le `package.json` diffère de la norme npm concernant l'ajout de dépendances ceci afin de gérer les dépendances fixes avec le builder.

- `dependencies` => `appDependencies`
- `devDependencies` => `testDependencies`
- `buildDependencies`

```json
{
  "appDependencies": {
    "hornet-js-components": "5.1.X"
    ...
  },
  "testDependencies": {
    "hornet-js-test": "5.1.X"
    ...
  },
  "buildDependencies": {
    "md-loader": "X"
    ...
  },  ...
}
```

#### Gestion des définitions Typescript

Afin de bénéficier de la compilation Typescript pour les modules d'un projet, il est possible de spécifier les fichiers de définition typescript spécifique au projet dans la section `tsDefinitionDependencies`. Celles-ci sont automatiquement ajouté au répertoire `definition-ts` à la racine du projet.

Le projet peut également avoir ses propres fichiers de définition en plus de ceux proposés par le framework.

```json
  "tsDefinitionDependencies": {
    "hornet-js-ts-typings": "5.1.X",
    "hornet-js-utils-dts": "5.1.X",
    "hornet-js-core-dts": "5.1.X"
    ...
	}
```

#### Exemple complet de `package.json`

```json
{
  "name": "applitutoriel",
  "version": "5.1.X",
  "main": "index.js",
  "description": "Application tutoriel utilisant le Framework hornet 5.1.X",
  "bugs": {
    "url": "https://github.com/diplomatiegouvfr/applitutoriel-js/issues"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/diplomatiegouvfr/applitutoriel-js.git"
  },
  "tsDefinitionDependencies": {
    "applitutoriel-js-common-dts": "5.1.X",
    "hornet-js-ts-typings": "5.1.X",
    "hornet-js-utils-dts": "5.1.X",
    "hornet-js-core-dts": "5.1.X",
    "hornet-js-components-dts": "5.1.X",
    "hornet-js-react-components-dts": "5.1.",
    "hornet-js-react-component-chart-dts": "5.1.X",
    "hornet-js-passport-dts": "5.1.X",
    "hornet-js-test-dts": "5.1.X"
  },
  "appDependencies": {
    "hornet-js-bean": "5.1.X",
    "hornet-js-components": "5.1.X",
    "hornet-js-react-components": "5.1.X",
    "hornet-js-react-component-chart": "5.1.X",
    "hornet-js-core": "5.1.X",
    "hornet-js-utils": "5.1.X",
    "hornet-js-passport": "5.1.X",
    "hornet-themes-intranet": "5.1.X",
    "jsonwebtoken": "7.3.0",
    "connect-flash": "0.1.1",
    "passport": "0.2.1",
    "passport-local": "1.0.0",
    "sha1": "1.1.1"
  },
  "buildDependencies": {},
  "testDependencies": {
    "hornet-js-test": "5.1.X"
  },
  "author": "MEAE - Ministère de l'Europe et des Affaires étrangères",

  "____HORNET-BUILDER____DO_NOT_MODIFY_THIS_OBJECT____": {
    "current": "92f3196ce9c86b9708e3273152885f52e18443a3",
    "history": {
      "92f3196ce9c86b9708e3273152885f52e18443a3": {
        "version": "5.1.X",
        "date": "2017-03-09T13:23:55.506Z",
        "deps": {"amdefine":"X.X.X", ...}
      }
    }
  }
}
```


### Fichier de configuration Typescript pour la compilation : `tsconfig.json`

Les projets doivent impérativement avoir un fichier `tsconfig.json` à la racine.
Celui-ci regroupe les informations de compilation typescript nécessaire au projet.

ex :
```json
{
  "compilerOptions": {
    "target": "ES5",
    "module": "commonjs",
    "moduleResolution": "classic",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "jsx": "react",
    "sourceMap": true,
    "noResolve": true,
    "importHelpers": true,
    "baseUrl": "./",
    "paths": {
      "tslib": [
        "definition-ts/hornet-js-ts-typings/tslib/tslib.d.ts"
      ]
    }
  },
  "include": [
    "./**/*.ts*",
    "./definition-ts/**/*.d.ts"
  ],
  "exclude": [
    "istanbul",
    "node_modules",
    "static"
  ]
}
```

### Fichier de configuration builder : `builder.js`

Les projets doivent comporter à la racine un fichier `builder.js` afin de déterminer le type de l'application : `application`, `module`, ... ainsi que les différentes tâches à éxécuter nécessaire à la construction.

Ce fichier doit comporter au minimum le code suivant pour hornet.js:

```javascript
module.exports = {
    type: "application",
    authorizedPrerelease: "true",

    gulpTasks: function (gulp, project, conf, helper) {
        //Add task if needed
        /*gulp.beforeTask("compile", function () {
         helper.info("Exemple before compile task");
         });

         gulp.afterTask("compile", function () {
         helper.info("Exemple after compile task");
         });*/

        // Cas PARTICULIER de l'application tuto pour pouvoir la générer en mode SPA et ISOMORPHIC sur la PIC
        // => on force la tâche prepare-package:spa tout le temps
        // si mode fullSpa : on redéfini les tâches 'watch' & 'watch-prod' pour y inclure la tâche "prepare-package-spa"
        //gulp.task("watch", ["compile", "prepare-package:spa", "watch:client"]);
        //gulp.task("watch-prod", ["compile", "prepare-package:spa", "watch:client-prod"]);
        gulp.addTaskDependency("package-zip-static", "prepare-package:spa");
        // conf.template.messages = require("applitutoriel-js-common/src/resources/messages.json")
        conf.template.forEach((elt, idx) => {
            if (conf.template[idx].context.forEach) {
                conf.template[idx].context.forEach((elt, idx2) => {
                    conf.template[idx].context[idx2].messages = {"applicationTitle": "Application TUTORIEL"};
                });
            } else {
                conf.template[idx].context.messages = {"applicationTitle": "Application TUTORIEL"};
            }
        });

    },
    externalModules: {
        enabled: false,
        directories: [
        ]
    },
    config: {
        routesDirs: ["." + path.sep + "routes"],

        // Exemple d'exclusion de fichiers/répertoires local à l'application et de modules
        // Cet exemple n'est pas forcement cohérent puisque le client.js n'est pas dépendant des middlewares
        // Il est là à titre d'exemple uniquement

        clientExclude: {
            dirs: [
                path.join("src", "services", "data"),
                "src/middleware",
                "nodemailer",
                "applitutoriel-js-common/src/actions"],
            filters: [
                path.join("src", "services", "data") + "/.*-data-\.*",
                ".*/src/actions/.*",
                "^config/*"
            ],
            modules: [
                "config",
                "continuation-local-storage",
                "carbone",
                "pdfmake",
                "pdfmake/src/printer",
                "pdfkit",
                "nodemailer",
                "fontkit"
            ]
        },
        clientContext: [
            [/moment[\/\\]locale$/, /fr|en/],
            [/intl[\/\\]locale-data[\/\\]jsonp$/, /fr|en/],
            [/.appender/, /console/]
        ],
        typescript: { //bin: "~/Dev/node-v4.5.0-linux-x64/lib/node_modules/typescript"
        },
        template: [
            {
                context: [{
                    error: "404",
                    suffixe: "_404",
                    message: "Oops! Nous ne trouvons pas ce que vous cherchez!"
                }, {error: "500", suffixe: "_500", message: "Oops! Une erreur est survenue!"}],
                dir: "./template/error",
                dest: "/error"
            }, {
                context: {message: "test template"}
            }
        ],
        spaResources: [path.join("..", "applitutoriel-js-common", "src", "resources") + "**/*.json"],
        dev: {
            dllEntry: {vendor: ["ajv", "react-dom", "react", "bluebird", "moment", "intl", "moment-timezone", "lodash"]}
        }
    }
};

```

Ce fichier doit comporter au minimum le code suivant pour hornet.js-lite:

```javascript
module.exports = {
    type: "application",

    gulpTasks: function (gulp, project, conf, helper) {

        helper.excludeNodeModulesFromWebpack(
            ["config", "continuation-local-storage", "sequelize", "pdfmake", "carbone", "csv-parser", "nodemailer"],
            conf.webPackConfiguration
        );
        conf.template.forEach((elt, idx) => {
            if (conf.template[idx].context.forEach) {
                conf.template[idx].context.forEach((elt, idx2) => {
                conf.template[idx].context[idx2].messages =  {"applicationTitle": "Application TUTORIEL"};
                });
            } else {
                conf.template[idx].context.messages =  {"applicationTitle": "Application TUTORIEL"};
            }
        });
    },

    externalModules: {
        enabled: false,
        directories: [
        ]
    },
    
    config: {
        routesDirs: ["." + path.sep + "routes"],
        ressources: ["database/**/*"],
        // Exemple d'exclusion de fichiers/répertoires local à l'application et de modules
        // Cet exemple n'est pas forcement cohérent puisque le client.js n'est pas dépendant des middlewares
        // Il est là à titre d'exemple uniquement
        clientExclude: {
            dirs: [
                path.join("src", "services", "data"),
                path.join("src", "dao"),
                "src/middleware",
                "nodemailer"],
            filters: [
                path.join("src", "services", "data") + "/.*-data-\.*"
            ],
            modules: [
                "hornet-js-database",
                "config",
                "continuation-local-storage",
                "sequelize",
                "pdfmake",
                "carbone",
                "csv-parser",
                "nodemailer",
                "tls"
            ]
        },
        clientContext: [
            [/moment[\/\\]locale$/, /fr|en/],
            [/intl[\/\\]locale-data[\/\\]jsonp$/, /fr|en/],
            [/.appender/, /console/]
        ],
        typescript: { //bin: "~/Dev/node-v4.5.0-linux-x64/lib/node_modules/typescript"
        },
        karma: {
            template: {
                debug: "./test/template/debug.html",
                context: "./test/template/context.html",
                clientContext: "./test/template/client_with_context.html"
            }
        },
        template: [
            {
                context: [{error: "404", suffixe: "_404", message: "Oops! Nous ne trouvons pas ce que vous cherchez!"}, {error: "500", suffixe: "_500", message: "Oops! Une erreur est survenue!"}],
                dir: "./template/error",
                dest: "/error"
            }, {
                context: {message: "test template"}
            }
        ]
        dev: {
            dllEntry: {vendor: ["hornet-js-react-components", "hornet-js-components", "hornet-js-utils"]}//"ajv", "d3", "react-dom", "react", "bluebird", "moment", "intl", "moment-timezone", "lodash"
        }
    }
};
```

* La clé `type` indique au builder le type de projet actuel. Pour une application le type doit toujours être `application` (types possibles : "parent", "application", "application-server", "module", "theme", "custom").
* La fonction `gulpTasks` permet :
    * d'ajouter de nouvelles tâches gulp au moyen du paramètre `gulp`
    * de modifier la configuration par défaut du builder (ajouter un répertoire de sources, modifier la conf webpack, ...)
    * d'exécuter des traitements avant ou après une tâche spécifique au moyen des méthodes `gulp.beforeTask(taskName, func)` et `gulp.afterTask(taskName, func)`
    * d'ajouter des dépendances à une tâche existante au moyen de la méthode `gulp.addTaskDependency(taskName, dependencyTaskName)`
* L'objet `externalModules` permet de déclarer des dépendances à partir de répertoires externes
* L'objet `config` permet de surcharger la configuration du builder dans chaque application
    * `routesDirs` permet de spécifier les répertoires des routes pour le code splitting automatique
    * `clientExclude` est un raccourci pour modifier la conf webpack et rajouter des __externals__
    * `clientNoParse` est un raccourci pour modifier la conf webpack et rajouter des __module.noParse__
    * `typescript.bin` permet de préciser une autre version de typescript pour la transpilation que celle utiliser ambarquée par le builder
    * `webpack` permet de configurer WebPack pour des projet ayant besoin de loader particulier...
    * `karma` permet de configurer karma (autre navigateur...)
    * `spaResources` liste de filtres permettant d'ajouter des ressources pour la génération de chunck SPA
    * `dllEntry` permet de préciser des dll webpack (gain de temps de construction des chunck)
    * `template` permet de configurer la tâche de templating html
        * `dir` répertoire des templates (par défault 'template')
        * `context` objet disponible pour le templating
        * `dest` répertoire de destination         
    * `clientContext` Filtre les modules ex moment et intl : [/moment[\/\\]locale$/, /fr|en/], [intl[\/\\]locale-data[\/\\]jsonp$/, /fr|en/] 
    * `spaFilter` Filtre les ressources pour le packaging spa, copie des fichiers ressource dans /static
    * `dev` Expérimentation du builder
        * `dllEntry` optimisation de chargement des librairies en dev
* `context` contiendra par défaut :
        
```javascript

     {
       project: 
       { 
         name: project.name,
         version: project.version, 
         static: "static-" + project.version + "/"
       }
     }
```

Exemple:

```javascript
...
    gulpTasks: function (gulp, project, conf, helper) {
        gulp.task("maNouvelleTache", function(done) {
            helper.info("Execution de 'maNouvelleTache'");
            done();
       });
    },
...
```

```shell
hb maNouvelleTache
```

### Objet de configuration du builder

La configuration par défaut du builder est la suivante:

```javascript
const testReportDir = "test_report";
const testWorkDir = "istanbul";
const defaultConf = {
    src: "src",
    test: "test",
    static: "static",
    js: "js",
    config: "./config",
    generatedTypings: {
        dir: ".",
        file: "definition.d.ts"
    },
    clientJs: "client.js",
    routesDirs: ["." + path.sep + "routes"],
    componentsDirs: [path.join("..", "src")],
    buildWorkDir: "target",
    testReportDir: testReportDir,
    testWorkDir: testWorkDir,
    templateDir: "html",
    mocha: {
        reporter: process.env.NODE_ENV === "integration" ? "xunit" : "spec",
        reporterOptions: {
            output: "test-results.xml"
        }
        //,"grep": "Router constructor"
    },
    istanbul: {
        dir: path.join(testWorkDir, "coverage"),
        reporters: ["lcov", "text", "text-summary", "cobertura", "json", "html"],
        reportOpts: {
            dir: path.join(testReportDir, "mocha"),
            lcov: {dir: path.join(testReportDir, "mocha", "lcov"), file: "lcov.info"},
            html: {dir: path.join(testReportDir, "mocha", "html")},
            json: {dir: path.join(testReportDir, "mocha"), file: "coverage_mocha.json"},
            cobertura: {dir: path.join(testReportDir, "mocha")}
        }
    },
    karma: {
        reporters: ["mocha", "coverage"],
        reportOpts: {
            dir: path.join(testReportDir, "karma"),
            lcov: {dir: path.join(testReportDir, "karma", "lcov"), file: "lcov.info"},
            html: {dir: path.join(testReportDir, "karma", "html")},
            json: {dir: path.join(testReportDir, "karma"), file: "converage_karma.json"}
        }
    },merge: {
        reporters: ["lcov", "text", "text-summary", "cobertura", "json", "html"],
        reportOpts: {
            dir: path.join(testReportDir, "merge"),
            lcov: {dir: path.join(testReportDir, "merge", "lcov"), file: "lcov.info"},
            html: {dir: path.join(testReportDir, "merge", "html")},
            json: {dir: path.join(testReportDir, "merge"), file: "coverage_mocha.json"},
            cobertura: {dir: path.join(testReportDir, "merge")}
        }
    },
    istanbulOpt: {
        includeUntested: true
    },
    webPackConfiguration: {
        module: {}
    },
    webPackMinChunks: 3,
    template: {
        context: {}
    }
```
## Les tâches fournies par hornetbuilder

### Les tâches de gestion des dépendances

`hornetbuilder` fourni les tâches suivantes afin de gérer les dépendances d'un projet :

| Tâche | Rôle | Dépendances |
| ----- | ---- | ----------- |
| dependencies:clean | supprime les dépendances applicatives (répertoire node_modules/app) | |
| dependencies:clean-build | supprime les dépendances de construction/test (répertoire node_modules/buildntest) | |
| dependencies:clean-all | supprime toutes les dépendances | |
| dependencies:clean-fix | supprime toutes les dépendances fixées, à utiliser avec l'option -f | |
| dependencies:check-app | vérifie la conformité des versions des dépendances applicatives déclarées | |
| dependencies:check-ts-definition | vérifie la conformité des versions des fichiers de définition Typescript | |
| dependencies:change-app | vérifie si les dépendances applicatives ont été modifiées | dependencies:check-app |
| dependencies:fix-app | Calcule l'arbre de dépendances applicatives et fixe les versions des dépendances transitives déclarées avec un ^, ~ ou *. Si plusieurs versions la plus récente est prise sauf si elle est fixée dans les depenances applicatives. | dependencies:change-app |
| dependencies:install-ts-definition | Installe les fichiers de définition | dependencies:check-ts-definition |
| dependencies:install-app | Installe les dépendances applicatives | dependencies:fix-app |
| dependencies:install-app-themes | Installe les dépendances applicatives de type theme dans les staic de l'application | dependencies:fix-app |
| dependencies:install-test | Installe les dépendances de test | |
| dependencies:install | Installe les dépendances applicatives et les fichiers de définitions | dependencies:install-ts-definition et dependencies:install-app |
| install | Alias de "dependencies:install" | dependencies:install |
| versions:set | permet de changer la version du projet | |
| dependency:set | permet de changer la version d'un module de dépendance du projet | |

### Les tâches de compilation

`hornetbuilder` fourni les tâches suivantes afin de compiler les sources d'un projet :

| Tâche | Rôle | Dépendances |
| ----- | ---- | ----------- |
| compile:ts | Transpile les sources TS en Javascript.<br />S'exécute uniquement si l'option "-i" (--ide) n'est pas utilisée.| clean |
| compile | Transpile les sources TS en Javascript. <br /> Cette tâche exécutera un dependencies:install en plus de la tâche clean de la commande compile:ts | dependencies:install<br />compile:ts |

### Les tâches de test

`hornetbuilder` fourni les tâches suivantes afin d'exécuter les tests d'un projet :

| Tâche | Rôle | Dépendances |
| ----- | ---- | ----------- |
| prepare:testSources | Copie les sources originales et compilées dans le répertoire de travail des tests : istanbul | compile |
| test:instrument | Défini les instruments de couverture de code sur les sources | prepare:testSources |
| test | Exécute les tests unitaires et la mesure de couverture de code | dependencies:install<br />test:instrument |
| test:karma | Exécute les tests basées sur KarmaJs | dependencies:install<br />compile |
| test:mocha | Exécute les tests basées sur MochaJs | dependencies:install<br />compile |
| test:merge-reports | Merge des rapports de test Mocha/Karma | clean-test:merge |
| test:remap-reports | Remap des rapports mergés sur les sources TypeScript | clean-test:remap |


### Les tâches de nettoyage

`hornetbuilder` fournit les tâches suivantes afin de nettoyer un projet :

| Tâche | Rôle | Répertoire/fichier | Dépendances |
| ----- | ---- | ----------| ----------- |
| clean | Supprime les fichiers générés (.js, .map et .d.ts dans le dossier de sources) |  | "clean:src", "clean:test" |
| clean:build | Supprime le répertoire de build | ./target | |
| clean:test | Supprime le dossier istanbul ainsi que les fichiers générés (.js, .map et .d.ts dans le dossier de tests) | test, test_report, karma_html|  |
| clean:static | Supprime les fichiers statics générés par webpack | ./static/js | |
| clean:theme | Supprime le thème de l'application dans le répêrtoire static | ./static/themeName | |
| clean:src | Supprime les fichiers généré dans le répertoire source ./src| extended/*.js", "**/*.json", "**/*.jsx | |
| clean:template | Supprime les templates générées dans la partie static | ./static/templateDir  |
| clean-all | Supprime tous les fichiers et dépendances | | "clean", "clean:build", "dependencies:clean-all", "clean:static", "clean:template" |


### Les tâches de construction des livrables

`hornetbuilder` fourni les tâches suivantes afin de construire les livrables d'un projet :

| Tâche | Rôle | Dépendances |
| ----- | ---- | ----------- |
| prepare-package-dll | Lance WebPack pour la construction des dll's js client |  |
| prepare-package | Lance WebPack pour la construction du js client  en mode production et copie les livrables dans le répertoire target | prepare-package:minified, prepare-all-package |
| prepare-package:dev | Lance WebPack pour la construction du js client  en mode debug et copie les livrables dans le répertoire target | prepare-package:minified, prepare-all-package |
| prepare-package:minified | Lance WebPack avec la minification pour la construction du js client, mode Production par défaut | |
| prepare-package-spa | Prépare les fichiers à packager pour un projet en FullSpa mode Production | |
| prepare-package-spa:dev | Prépare les fichiers à packager pour un projet en FullSpa mode Dev | |
| prepare-all-package |copie les livrables dans le répertoire target | |
| template-html | Lance le templating html |  |
| zip-static | Construit le livrable statique (zip) | |
| zip-dynamic | Construit le livrable dynamique (zip) | |
| zip-environment | Construit le livrable environment (zip) | |
| zip-database | Construit le livrable database (zip) | |
| package-zip-static | Construit le livrable statique (zip) | prepare-package-client:minified, zip-static |
| package-zip-dynamic | Construit le livrable dynamique (zip) | prepare-package-client:minified, zip-dynamic|
| package-zip-static:dev | Construit le livrable statique (zip) | prepare-package-client:dev, zip-static |
| package-zip-dynamic:dev | Construit le livrable dynamique (zip) | prepare-package-client:dev, zip-dynamic|
| package | Package global de l'application en mode Production  | compile, test, template-html, prepare-package,  zip-static, zip-dynamic, zip-environment, zip, database |
| package:dev | Package global de l'application en mode Dev | compile, test, template-html, prepare-package:dev,  zip-static, zip-dynamic, zip-environment, zip, database |
| package-spa | Package SPA de l'application en mode Production  | compile, test, template-html, prepare-package-spa,  zip-static, zip-dynamic, zip-environment, zip, database |
| package-spa:dev | Package SPA de l'application en mode Dev | compile, test, template-html, prepare-package-spa:dev,  zip-static, zip-dynamic, zip-environment, zip, database |


### Les tâches de watch

`hornetbuilder` fourni les tâches suivantes afin d'outiller le démarrage d'une application en développement

| Tâche | Rôle | Dépendances |
| ----- | ---- | ----------- |
| watch:ts | Ecoute les modifications sur les fichiers TS et les recompile à la volée.<br />S'exécute uniquement si l'option "-i" (--ide) n'est pas utilisée | |
| watch:serveur | Ecoute les modifications sur les fichiers et redémarre le serveur node pour les prendre en compte.<br />Démarre nodejs en mode development | watch:ts |
| watch:serveur-prod | Equivalent à watch:serveur mais avec nodejs en mode production | watch:ts |
| watch:client | Ecoute les modifications sur les fichiers et relance WebPack à la volée.<br />Lance WebPack en mode development. | watch:ts |
| watch:client-prod | Equivalent à watch:client mais avec WebPack en mode production | watch:ts |
| watch | Compile et écoute les modifications pour redémarrer nodejs et relancer WebPack si besoin.<br />mode : development | compile<br />watch:client<br />watch:serveur |
| watch-prod | Compile et écoute les modifications pour redémarrer nodejs et relancer WebPack si besoin.<br />mode : production  | compile<br />watch:client-prod<br />watch:serveur-prod |
| w | Alias de "watch" | watch |
| wp | Alias de "watch-prod" | watch-prod |

### Les tâches de qualimétrie

`hornetbuilder` fourni les tâches suivantes afin de construire des rapports de qualimétrie :

| Tâche | Rôle | Dépendances |
| ----- | ---- | ----------- |
| lint | Lance le tslint sur les sources ts (qualité de code) | |

```shell
hb lint
```

```shell
hb lint --lintReport json
```

## Le cycle de vie d'un projet

### Première utilisation du builder

Lors de la première utilisation du builder et peu importe la commande, le builder va installer les dépendances de construction/test afin que celles-ci soient disponibles dans le fichier `builder.js`. Cela permet d'ajouter à un projet des tâches de construction dépendantes de modules non fournis par le framework. Il sera ainsi possible d'écrire dans le fichier `builder.js` :

```javascript

var maDependanceSpecifique = require("maDependanceSpecifique");

```

### En cours de développement

Dès la première utilisation du builder sur un projet, il est possible d'utiliser la commande :

```shell

hb watch

```

Dans un ide qui compile automatiquement les fichiers typescript, il est recommandé d'utiliser l'option -i

```shell

hb watch -i

```

ou bien :

```shell

hb w -i

```

Les dépendances entre les tâches du builder font que l'arbre des dépendances applicatives va être calculé, que les versions non fixées vont l'être, que l'ensemble des dépendances vont s'installer, que les sources vont se compiler, que le serveur nodejs va démarrer et que les modifications des fichiers seront écoutées.

Il est néanmoins possible de lancer indépendemment les différentes tâches :

```shell

hb dependencies:install

```

```shell

hb compile

```

```shell

hb watch

```

### Lancement des tests

#### MochaJs

```shell

hb test

```

Exécute les tests et fournit sur la console :

- la description de chaque test exécuté
- le nombre de tests OK et KO
- si tous les tests sont OK : le taux de couverture de code total et fichier par fichier

Les fichiers exécutés doivent se trouver dans le répertoire __./test__ et se nommer __*-spec.js__ sachant que la phase de compile passe avant.

#### KarmaJs

```shell

hb test:karma

```

```shell

hb test:karma --file ./test/page/test.karma.js

```

Le test à exécuter est donné par le paramètre __-file__ ou si aucun n'est précisé, il prend la configuration karma et par défaut c'est __tests.webpack.js__.
Ce dernier référence tous les tests à exécuter grace à __require__, exemple qui tire tous les fichiers __*.karma.js__ dans le répertoire __test__:

```javascript

var context = require.context('./test', true, /\.karma\.js$/);
context.keys().forEach(context);

```
Les rapports sont générés dans le répertoire __./test_report__

Le navigateur utilisé par défaut est __Firefox__. Pour en ajouter ou en utiliser un autre, il faut surcharger la configuration dans le fichier __builder.js__, exemple :

```javascript

    config : {
        ....
        ..
        karma: {
            browsers: ["Chrome", "Firefox"],
        }
    }
    
```

Par défaut, lorsque les tests sont ouverts dans un navigateur, aucune feuille de style hornet n'est chargée. Il est possible de surcharger les templates karma:

```javascript

    config : {
        ....
        ..
        karma: {
            template: {
                debug: "./test/template/debug.html",
                context: "./test/template/context.html",
                clientContext: "./test/template/client_with_context.html"
            }
        }
    }
    
```

les templates fournis nécessitent de démarrer un serveur de thèmes.


#### Templating Html

```shell
hb template-html
```

Lance le templating basé sur **EJS** et écrit les fichiers dans 'static/html' du projet.

Si l'objet de configuration *tempate* est un tableau, il lancera autant de templating que d'élément dans le tableau, exemple :

```javascript

template: [ 
    {
        context: [{error: "404", suffixe: "_404", message: "Oops! Nous ne trouvons pas ce que vous cherchez!"}, {error: "500", suffixe: "_500", message: "Oops! Une erreur est survenue!"}],
        dir: "./template/error",
        dest: "/error"
    }, {
        context: {message: "test template"}
    }
]
    
```

Dans cet exemple, le templating suivant est lancé :

1. Sur le répertoire "./template/error" et autant de fois que d'item dans l'attribut context (2). Les fichiers seront suffixés par l'attibut suffixe de chaque contexte (_404, _500) et générés dans le répertoire **error** (attibut *dest*) dans **static/html** du projet.
2. Sur le répertoire "./template" (valeur par défaut)


### Construction des livrables

```shell

hb package

```

Construit les différents livrables et les place dans le répertoire `target` à la racine du projet.

### Publication

```shell

hb publish --publish-registry <URL>

```

Publie le module sur un repository spécifique.

### Changement de version

```shell

hb versions:set --versionFix=1.2.3

```

Modifie la version du projet ou des projets si on est sur un type parent en **'1.2.3'**.


```shell

hb versions:set --versionFix=

```

Modifie la version du projet en suffixant par un timestamp **'YYYYMMDDHHmmss'**.


```shell

hb versions:set --versionFix=\'-123\'

```

Modifie la version du projet en suffixant par  **'-123'**, il faut echapper les caractères **`**.

### Changement de version d'une dépendance

```shell

hb dependency:set --versionFix=1.2.3 --dependencyVersionFix=monpackage

```

Reprend les principes de `versions:set` mais sur les dépendances d'un projet.

### Changement de version d'une dépendance en snapshot

```shell

hb dependency:set-snapshot --dependencyVersionFix=monpackage --module=monpackage

```

### Recherche de dernière version d'une dépendance

```shell

hb versions:get --versionSearch=5.0.2 --module=hornet-js-core

```

Retourne la dernière version commencant par 5.0.2 du module hornet-js-core, exemple : 5.0.2-20180109183247. Si le module n'est pas renseigné, c'est sur le projet lui-même que la recherche est faite, et si `versionSearch` n'est pas renseigné c'est la dernière version qui est retournée (sans contrainte de préfixe)

```shell

hb versions:get --versionSearch=snapshot --module=hornet-js-core

```

Permet d'avoir la dernière version snapshot d'un module présent dans les dépendances du projet (appDependencies, buildDependencies, ...).

## Licence

`hornet-js-builder` est sous [licence cecill 2.1](./LICENSE.md).

Site web : [![http://www.cecill.info](http://www.cecill.info/licences/Licence_CeCILL_V2.1-en.html)](http://www.cecill.info/licences/Licence_CeCILL_V2.1-en.html)