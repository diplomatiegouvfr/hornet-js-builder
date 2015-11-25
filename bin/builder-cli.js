#!/usr/bin/env node
":" //# comment; exec node --harmony "$0" "$@"

var processDir = process.cwd();
process.title = "hornet-js-builder > " + processDir;

// Chargement des dépendances
var _ = require("lodash");
var chalk = require("chalk");
var path = require("path");
var helper = require("../src/helpers");
var commander = require("commander");
var npm = require("npm");
var gulp = require("gulp");
var gutil = require("gulp-util");
//Gestion de la ligne de commandes
commander
    .version(require("../package.json").version)
    .usage("[options] <tasks ...>")
    .option("-d, --debug", "Mode debug")
    .option("--show-webpack-files", "Log les fichiers pris en compte par webpack dans sa phase de compilation du bundle client")
    .option("-i, --ide", "Indique que c'est l'IDE qui compile les TS, dans ce cas la compilation TS est désactivée ainsi que les watchers associés")
    .option("-r, --registry <url>", "L'url du repository servant à la publication (tasks 'publish' & 'unpublish'")
    .option("-f, --force", "Forcer la mise à jour des dépendances")
    .option("--skipTests", "Permet de ne pas exécuter les tests")
    .option("--skipMinified", "Permet de ne pas minifier les chuncks")
    .option("-p, --debugPort <port>", "Le port utilisé par node pour permettre la connexion d'un debugger")
    .parse(process.argv);

helper.setForce(commander.force);
helper.setDebug(commander.debug);
helper.setRegistry(commander.registry);
helper.setSkipTests(commander.skipTests);
helper.setSkipMinified(commander.skipMinified);
helper.setIDE(commander.ide);
helper.setShowWebPackFiles(commander.showWebpackFiles);

helper.info(chalk.cyan("Démarrage de hornet-js-builder dans ", processDir));
helper.logBuilderModes();
helper.setDebugPort(commander.debugPort);

npm.load(function (err, npmLoaded) {
    if (err) {
        helper.error("Erreur de chargement du module 'npm':", err);
        process.exit(1);
    }
    var project = helper.getCurrentProject();
    helper.info(chalk.cyan("Builder lancé sur le projet", project.packageJson.name, "en version", project.packageJson.version));

    // mise à jour du registry dans npm si passé en paramètre
    if (helper.getRegistry()) {
        npm.config.set("registry", helper.getRegistry());
    }
    helper.info("Utilisation du registry : " + npm.config.get("registry"));

    // adaptation de gulp
    require("../src/extended/gulp-cli-adapter")(gulp);

    // chargement des tasks, on exécute une fois que tout est chargé
    require("../src/builders-loader")(project, function() {
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
