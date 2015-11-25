# hornet-js-builder

## Description

**hornet-js-builder** a été développé dans le but premier de masquer la complexité des différentes tâches nécessaires à la construction d'un projet. Son second objectif est d'accompagner le développeur en lui fournissant des outils tout au long du developpement d'un projet.

A cet effet il surcharge les librairies **gulp** et **npm** pour fournir des tâches se rapprochant de la philosophie `maven` ainsi que des utilitaires pour simplifier et pérenniser la gestion des dépendances.

Les versions de chaque dépendance déclarée doivent également être fixes (sans ^, ~ ou *) afin de pérenniser les versions.


## Installation

### Depuis NPM

 ```shell
 $ npm install -g hornet-js-builder
 ```

### Depuis les sources

Installer **hornet-js-builder** de manière globale:
 - Se placer dans le dossier de *hornet-js-builder*
 - Lancer la commande

 ```shell
 $ npm install -g
 ```

 ### Note

En cas de MAJ à partir d'une version antérieure de **hornet-js-builder**: supprimer les dossiers `node_modules` de chaque projet

 ### Commandes

Suite à cette installation, les commandes **hornetbuilder** et **hb** (alias de la première) sont accessibles en globale dans les scripts

## Principe de gestion des dépendances

Le builder organise les dépendances de manière "flat" et gère la transitivité des dépendances.

Il impose la déclaration de dépendance en version fixe (sans ^, ~ ou *) afin de pérenniser les versions.

Il impose également une structure du fichier 'package.json' légèrement différente de celle par défaut :

 - Les dépendances applicatives normalement définies au moyen de la clé `dependencies` doivent impérativement être définies dans la clé `appDependencies`
 - Les dépendances de construction et de test normalement définies au moyen de la clé `devDependencies` doivent impérativement être définies dans la clé `buildAndTestDependencies`

Afin que les dépendances applicatives et les dépendances de construction/test ne rentrent pas en conflit, les dépendances sont installées dans deux répertoires différents à l'intérieur du répertoire `node_modules` :

 - app
 - buildntest

Pour que le serveur nodejs sache lire les dépendances dans ce nouveau répertoire `node_modules/app` un fichier "bootstrap" nommé `index.ts` permet de démarrer le serveur.

Lorsque le builder détecte par transitivité une dépendance dont la version n'est pas fixe (ex: ^3.0.0), il récupère la dernière version correspondante sur le repository courant et la fixe dans un objet `____HORNET-BUILDER____DO_NOT_MODIFY_THIS_OBJECT____` qui est sauvegardé à la fin du fichier `package.json`.
**Cet objet ne doit surtout pas être modifié manuellement !!**

Exemple d'un fichier `package.json` complet avec version fixée par le builder :

```json
{
  "name": "applitutoriel",
  "version": "5.0.0",
  "main": "index.js",
  "description": "Application tutoriel utilisant le Framework hornet 5.0.0",
  "appDependencies": {
    "hornet-js-components": "5.0.0",
    "hornet-js-core": "5.0.0",
    "hornet-js-ts-typings": "5.0.0",
    "hornet-js-utils": "5.0.0",
    "connect-flash": "0.1.1",
    "node-jsx": "0.13.3",
    "passport": "0.2.1",
    "passport-local": "1.0.0",
    "sha1": "1.1.1"
  },
  "buildAndTestDependencies": {
    "chai": "1.10.0",
    "chai-jquery": "2.0.0",
    "cheerio": "0.18.0",
    "sinon": "1.13.0",
    "sinon-chai": "2.7.0"
  },
  "author": "MAEDI",





  "____HORNET-BUILDER____DO_NOT_MODIFY_THIS_OBJECT____": {
    "current": "b9265f7937e0a4a52491f52fe18fe26a537052e8",
    "history": {
      "b9265f7937e0a4a52491f52fe18fe26a537052e8": {
        "date": "2015-11-09T10:02:18.543Z",
        "deps": {"amdefine":"1.0.0","base62":"1.1.0","charenc":"0.0.1","commoner":"0.10.3","crypt":"0.0.1","install":"0.1.8","jstransform":"11.0.3","object-assign":"2.1.1","passport-strategy":"1.0.0"}
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
$ hb test
```

Une aide est fournie en tapant la commande

```shell
$ hb --help
```

 Les options suivantes sont alors proposées:

| Option | Rôle |
| ------ | ---- |
| -V, --version | Affiche la version du builder |
| -d, --debug | Active les messages de logs du builder en mode debug |
| --show-webpack-files | Active le listing des fichiers embarqués par webpack lors de la construction du bundle de fichiers clients. Note: Les fichiers sont triés par taille croissante |
| -i, --ide | Indique que c'est l'IDE qui gère la compilation des fichiers .ts, .d.ts et .map. Dans ce mode la compilation des fichiers TypeScripts est désactivée ainsi que les watchers associés. De même, la tâche clean ne supprime plus ces fichiers. <br /> Cette option doit être utilisée dès lors qu'une IDE est lancé sur les projets |
| -r, --registry <URL> | Permet d'utiliser un repository spécifique. Par défaut le repository défini dans le fichier .npmrc est utilisé |
| -f, --force | Permet de forcer la mise à jour des dépendances |
| --skipTests | Permet de ne pas exécuter les tests si ceux-ci doivent être exécutés (ex: tâche "package") |
| -p, --debugPort | Indique le port utilisé par node pour permettre la connexion d'un debugger externe |
[hornetbuilder - aide]

## Configurer un projet pour utiliser hornetbuilder

Pour être compatible avec **hornetbuilder**, un projet doit comporter à sa racine un fichier `builder.js`.

Ce fichier doit comporter au minimum le code suivant:

```javascript
module.exports = {
    type: "application",

    gulpTasks: function (gulp, project, conf, helper) {

    },

    externalModules: {
        enabled: false,
        directories: [
        ]
    }
};
```

- La clé `type` indique au builder le type de projet actuel. Pour une application le type doit toujours être '**application**'
- La fonction `gulpTasks` permet :
  - d'ajouter de nouvelles tâches gulp au moyen du paramètre `gulp`
  - de modifier la configuration par défaut du builder (ajouter un répertoire de sources, modifier la conf webpack, ...)
  - d'exécuter des traitements avant ou après une tâche spécifique au moyen des méthodes `gulp.beforeTask(taskName, func)` et `gulp.afterTask(taskName, func)`
  - d'ajouter des dépendances à une tâche existante au moyen de la méthode `gulp.addTaskDependency(taskName, dependencyTaskName)`
 - L'objet `externalModules` permet de déclarer des dépendances à partir de répertoires externes

Exemple:

```javascript
[...]
    gulpTasks: function (gulp, project, conf, helper) {
        gulp.task("maNouvelleTache", function(done) {
            helper.info("Execution de 'maNouvelleTache'");
            done();
       });
    },
[...]
```

```shell
$ hb maNouvelleTache
```

## Les tâches fournies par hornetbuilder


### Les tâches de gestion des dépendances

**hornetbuilder** fourni les tâches suivantes afin de gérer les dépendances d'un projet :

| Tâche | Rôle | Dépendances |
| ----- | ---- | ----------- |
| dependencies:clean | supprime les dépendances applicatives (répertoire node_modules/app) | |
| dependencies:clean-build | supprime les dépendances de construction/test (répertoire node_modules/buildntest) | |
| dependencies:clean-all | supprime toutes les dépendances | |
| dependencies:check-app | vérifie la conformité des versions des dépendances applicatives déclarées | |
| dependencies:change-app | vérifie si les dépendances applicatives ont été modifiées | dependencies:check-app |
| dependencies:fix-app | Calcule l'arbre de dépendances applicatives et fixe les versions des dépendances transitives déclarées avec un ^, ~ ou * | dependencies:change-app |
| dependencies:install | Installe les dépendances applicatives | dependencies:fix-app |
| install | Alias de "dependencies:install" | dependencies:fix-app |
[hornetbuilder - tâches de gestion des dépendances]

### Les tâches de compilation

**hornetbuilder** fourni les tâches suivantes afin de compiler les sources d'un projet :

| Tâche | Rôle | Dépendances |
| ----- | ---- | ----------- |
| compile:ts | Transpile les sources TS en Javascript.<br />S'exécute uniquement si l'option "-i" (--ide) n'est pas utilisée | clean |
| compile | Transpile les sources TS en Javascript. | dependencies:install<br />compile:ts |
[hornetbuilder - tâches de compilation]

### Les tâches de test

**hornetbuilder** fourni les tâches suivantes afin d'exécuter les tests d'un projet :

| Tâche | Rôle | Dépendances |
| ----- | ---- | ----------- |
| prepare:testSources | Copie les sources originales et compilées dans le répertoire de travail des tests : istanbul | compile |
| test:instrument | Défini les instruments de couverture de code sur les sources | prepare:testSources |
| test | Exécute les tests unitaires et la mesure de couverture de code | dependencies:install<br />test:instrument |
[hornetbuilder - tâches de test]

### Les tâches de nettoyage

**hornetbuilder** fourni les tâches suivantes afin de nettoyer un projet :

| Tâche | Rôle | Dépendances |
| ----- | ---- | ----------- |
| clean:test | Supprime le dossier istanbul ainsi que les fichiers générés (.js, .map et .d.ts dans le dossier de tests) | |
| clean | Supprime les fichiers générés (.js, .map et .d.ts dans le dossier de sources) | clean:test |
[hornetbuilder - tâches de nettoyage]

### Les tâches de construction des livrables

**hornetbuilder** fourni les tâches suivantes afin de construire les livrables d'un projet :

| Tâche | Rôle | Dépendances |
| ----- | ---- | ----------- |
| prepare-package | Lance WebPack pour la construction du js client  (mode debug) | |
| prepare-package:minified | Lance WebPack avec la minification pour la construction du js client | |
| prepare-package:spa | Prépare les fichiers à packager pour un projet en FullSpa | |
| package-zip-static | Construit le livrable statique | prepare-package:minified |
| package-zip-dynamic | Construit le livrable dynamique | prepare-package:minified |
| package | Lance les tests puis construit tous les livrables | test<br />package-zip-static<br />package-zip-dynamic |
[hornetbuilder - tâches de construction des livrables]

### Les tâches de watch

**hornetbuilder** fourni les tâches suivantes afin d'outiller le démarrage d'une application en développement

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
[hornetbuilder - tâches de watch]

### Les tâches de qualimétrie

**hornetbuilder** fourni les tâches suivantes afin de construire des rapports de qualimétrie :

| Tâche | Rôle | Dépendances |
| ----- | ---- | ----------- |
| lint | Lance le tslint sur les sources ts (qualité de code) | |
[hornetbuilder - tâches de qualimétrie]

## Le cycle de vie d'un projet

### Première utilisation du builder

Lors de la première utilisation du builder et peu importe la commande, le builder va installer les dépendances de construction/test afin que celles-ci soient disponibles dans le fichier `builder.js`. Cela permet d'ajouter à un projet des tâches de construction dépendantes de modules non fournis par le framework. Il sera ainsi possible d'écrire dans le fichier `builder.js` :

```javascript
var maDependanceSpecifique = require("maDependanceSpecifique");
```

### En cours de developpement

Dès la première utilisation du builder sur un projet, il est possible d'utiliser la commande :

```shell
$ hb watch
```

Dans un ide qui compile automatique les fichiers typescript, il est recommandé d'utiliser l'option -i

```shell
$ hb watch -i
```

Les dépendances entre les tâches du builder font que l'arbre des dépendances applicatives va être calculé, que les versions non fixées vont l'être, que l'ensemble des dépendances vont s'installer, que les sources vont se compiler, que le serveur nodejs va démarrer et que les modifications des fichiers seront écoutées.

Il est néanmoins possible de lancer indépendemment les différentes tâches :

```shell
$ hb dependencies:install
```

```shell
$ hb compile
```

```shell
$ hb watch
```

### Lancement des tests

```shell
$ hb test
```

Exécute les tests et fourni sur la console :

- la description de chaque test exécuté
- le nombre de tests OK et KO
- si tous les tests sont OK : le taux de couverture de code total et fichier par fichier

### Construction des livrables

```shell
$ hb package
```

Construit les différents livrables et les place dans le répertoire `target` à la racine du projet.


## Licence

hornet-js-builder est sous [licence cecill 2.1](./LICENCE.md).

Site web : [![http://www.cecill.info](http://www.cecill.info/licences/Licence_CeCILL_V2.1-en.html)](http://www.cecill.info/licences/Licence_CeCILL_V2.1-en.html)