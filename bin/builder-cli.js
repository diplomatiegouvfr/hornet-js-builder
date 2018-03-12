#!/usr/bin/env node
":" //# comment; exec node --harmony "$0" "$@"

"use strict";

const processDir = process.cwd();
process.title = "hornet-js-builder > " + processDir;

// Chargement des dépendances
const _ = require("lodash");
const chalk = require("chalk");
const path = require("path");
const helper = require("../src/helpers");
const docker = require("../src/docker/docker-runner");
const commander = require("commander");
const npm = require("npm");
const gulp = require("gulp");

//Gestion de la ligne de commandes
commander
    .version(require("../package.json").version)
    .usage("[options] <tasks ...>")
    .option("-d, --debug", "Mode debug")
    .option("-D, --docker [options]", "Exécute les commandes du Builder dans le container Docker nodeJS")
    .option("-l, --list", "Listing de toutes les tâches")
    .option("--show-webpack-files", "Log les fichiers pris en compte par webpack dans sa phase de compilation du bundle client")
    .option("--webpackVisualizer", "Visualisation de la répartition des sources projets et node modules dans un chart, /static/dev/webpack-visualizer.html")
    .option("-i, --ide", "Indique que c'est l'IDE qui compile les TS, dans ce cas la compilation TS est désactivée ainsi que les watchers associés")
    .option("-r, --registry <url>", "L'url du repository global : servant à la récupération des dépendances et à la publication")
    .option("--publish-registry <url>", "L'url du repository servant uniquement à la publication (tasks 'publish' & 'unpublish'")
    .option("-f, --force", "Forcer la mise à jour des dépendances")
    .option("--ignoreApp", "ne prend pas la version de dépendance applicative, mais la plus récente")
    .option("--skipTests", "Permet de ne pas exécuter les tests")
    .option("--stopOnError", "Permet de stopper toutes les tâches sur une erreur")    
    .option("--skipMinified", "Permet de ne pas minifier les chuncks")
    .option("--noWarn", "Permet de ne pas afficher les warnings")
    .option("-p, --debugPort <port>", "Indique le port utilisé par node pour permettre la connexion d'un debugger externe")
    .option("--lintRules <path>", "Indique un fichier de rules 'tslint.json' autre que celui utilisé par le builder")
    .option("--lintReport <format>", "Indique le format de sortie pour tslint : prose (défaut), json, verbose, full, msbuild")
    .option("-m, --module <module>", "Indique le module pour lequel on souhaite avoir une recherche de version")
    .option("--file <file>", "Indique le chemin d'un fichier")
    .option("--dev", "active le mode developpement")
    .option("--offline", "active le mode offline pour la récupération des dépendances, ex : coupure réseau. Prerequis avoir les node_modules, ajouter fetch-retries=0 dans .npmrc")
    //    .option("--release <final / snapshot>", "version ou suffixe si commence par '-' ou '.'", /^(final|snapshot)$/i)     
    .option("--versionFix <versionFix>", "version ou suffixe si commence par '-', '.' ou si null", (value) => { console.log(value); return value ? value.replace(/'/g, "") : "auto" })
    .option("--versionSearch <versionSearch>", "préfixe de la dernière version", (value) => { console.log(value); return value ? value.replace(/'/g, "") : "auto" })
    .option("--dependencyVersionFix <dependency>", "Fix une version pour une dépendance")
    .parse(process.argv);

helper.setForce(commander.force);
helper.setDebug(commander.debug);
helper.setDocker(commander.docker);
helper.setList(commander.list);
helper.setRegistry(commander.registry);
helper.setPublishRegistry(commander.publishRegistry);
helper.setSkipTests(commander.skipTests);
helper.setSkipMinified(commander.skipMinified);
helper.setNoWarn(commander.noWarn);
helper.setIDE(commander.ide);
helper.setShowWebPackFiles(commander.showWebpackFiles);
helper.setWebpackVisualizer(commander.webpackVisualizer);
helper.setDebugPort(commander.debugPort);
helper.setLintRules(commander.lintRules);
helper.setLintReport(commander.lintReport);
helper.setIgnoreAppDepVersion(commander.ignoreApp);
helper.setModule(commander.module);
helper.setFile(commander.file);
helper.setDevMode(commander.dev);
helper.setOfflineMode(commander.offline);
helper.setRelease(commander.release);
helper.setVersion(commander.versionFix);
helper.setVersion(commander.versionSearch);
helper.setDependency(commander.dependencyVersionFix);
helper.setStopOnError(commander.stopOnError)

helper.setCommandArgs(process.argv);
helper.info("\n"+
    "  _    _                       _       _      \n" +
    " | |  | |                     | |     (_)     \n" +
    " | |__| | ___  _ __ _ __   ___| |_     _ ___  \n" +
    " |  __  |/ _ \\| '__| '_ \\ / _ \\ __|   | / __| \n" +
    " | |  | | (_) | |  | | | |  __/ |_  _ | \\_ \\ \n" +
    " |_|  |_|\\___/|_|  |_| |_|\\___|\\__|(_)| |___/ \n" +
    "                                     _/ |     \n" +
    "                                    |__/      \n")

helper.info(chalk.cyan("Démarrage de hornet-js-builder dans ", processDir));
helper.logBuilderModes();

helper.allowJSON5();

let config = {
    loglevel: "warn"
};

npm.load(config, function (err, npmLoaded) {
    if (err) {
        helper.error("Erreur de chargement du module 'npm':", err);
        process.exit(1);
    }
    var project = helper.getCurrentProject();
    helper.info(chalk.cyan("Builder lancé sur le projet", project.packageJson.name, "en version", project.packageJson.version));

    var npmDefaultRegistry = npm.config.get("registry");
    if (!helper.getRegistry() && !helper.getPublishRegistry()) {
        helper.info("Utilisation du registry configuré dans NPM : " + npmDefaultRegistry);
    } else {
        var retrieveRegistry = helper.getRegistry() ? helper.getRegistry() : npmDefaultRegistry;
        var publishRegistry = helper.getPublishRegistry() ? helper.getPublishRegistry() : npmDefaultRegistry;
        helper.info("Utilisation des registry : [ retrieve : " + retrieveRegistry + " ; publish : " + publishRegistry + "]");

        // on prend par défaut le retrieve registry
        npm.config.set("registry", retrieveRegistry);
    }

    // adaptation de gulp
    require("../src/extended/gulp-cli-adapter")(gulp);


    // chargement des tasks, on exécute une fois que tout est chargé
    require("../src/builders-loader")(project, function () {
        // vérification de l'existence des tâches à exécuter
        var tasks = (commander.args.length ? commander.args : ["default"]);
        helper.checkTasksExistence(gulp, tasks);

        // Exécution des tasks
        process.nextTick(function () {
            require("run-sequence").apply(gulp, tasks.concat(
                function (err) {
                    if (err) {
                        process.exit(1);
                    }
                }
            ));
        });
    });
});
