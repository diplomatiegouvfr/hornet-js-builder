"use strict";
var helper = require("./helpers");
var path = require("path");
var chalk = require("chalk");
var _ = require("lodash");

var npm = require("npm");

Error.stackTraceLimit = Infinity;
var gulp = require("gulp");

// Les builders
var parentBuilder = require("./builders/parent-builder");
var themesBuilder = require("./builders/themes-builder");
var commonTaskBuilder = require("./builders/common-tasks-builder");
var applicationAndModuleBuilder = require("./builders/application-and-module-builder.js");
const State = require("./builders/state");

module.exports = function (project, done) {

    var conf = {
        baseDir: project.dir
    };

    function callProjectBuilderAndGulpTasks() {
        if (_.isFunction(project.builderJs.gulpTasks)) {
            helper.debug("Execution de la fonction 'gulpTasks' fournie par le projet");
            project.builderJs.gulpTasks(gulp, project, conf, helper);
        } else {
            helper.debug("Pas de fonction 'gulpTasks' fournie par le projet")
        }

        // lancement des tâches gulp
        done();
    }

    helper.info(chalk.cyan("Chargement des tâches du projet '" + project.name + "'"));
    helper.checkOrInstallBuildDependencies(project, npm, function() {
        // on déclare le répertoire temporairement le temps de charger le fichier "builder.js" du projet
        var moduleResolver = require("./module-resolver");
        moduleResolver.addModuleDirectory(path.normalize(path.join(project.dir, helper.NODE_MODULES_BUILD)));

        //on install les dépendances de test dans le cas ou le builder.js comprend des requieres vers des modules

        project.builderJs = require(path.join(project.dir, helper.BUILDER_FILE));
        project.type = project.builderJs.type;

        _.merge(conf, project.builderJs.config);

        // on supprime la déclaration car le fichier "builder.js" a été chargé
        moduleResolver.removeModuleDirectory(path.normalize(path.join(project.dir, helper.NODE_MODULES_BUILD)));

        // on charge les tâche gulp prédéfinies par hornet-js-builder
        commonTaskBuilder.gulpTasks(gulp, project, conf, helper);
        if (project.type === helper.TYPE.PARENT) {
            State.parentBuilder.externalModules = project.builderJs.externalModules;
            applicationAndModuleBuilder.gulpTasks(gulp, project, conf, helper);
            parentBuilder.gulpTasks(gulp, project, conf, helper, callProjectBuilderAndGulpTasks);

        } else {
            if (project.type === helper.TYPE.CUSTOM) {

            } else if (project.type === helper.TYPE.THEME) {

                // Le theme est tellement différent qu"on lui fourni un objet de conf personnel
                themesBuilder.gulpTasks(gulp, project, conf, helper);
            } else {
                applicationAndModuleBuilder.gulpTasks(gulp, project, conf, helper);
            }
            callProjectBuilderAndGulpTasks();
        }
    }).catch((err) => {
        console.error(err);
    });
};
