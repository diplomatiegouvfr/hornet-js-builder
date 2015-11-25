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

    helper.info(chalk.cyan("Chargement des tâches du projet '" + project.name + "'"))
    helper.checkOrInstallBuildAndTestDependencies(project, npm, function() {
        // on déclare le répertoire temporairement le temps de charger le fichier "builder.js" du projet
        var moduleResolver = require("./module-resolver");
        moduleResolver.addModuleDirectory(path.normalize(path.join(project.dir, helper.NODE_MODULES_TEST)));

        project.builderJs = require(path.join(project.dir, "builder.js"));
        project.type = project.builderJs.type;

        // on supprime la déclaration car le fichier "builder.js" a été chargé
        moduleResolver.removeModuleDirectory(path.normalize(path.join(project.dir, helper.NODE_MODULES_TEST)));


        // on charge les tâche gulp prédéfinies par hornet-js-builder
        commonTaskBuilder.gulpTasks(gulp, project, conf, helper);
        if (project.type === "parent") {
            applicationAndModuleBuilder.gulpTasks(gulp, project, conf, helper);
            parentBuilder.gulpTasks(gulp, project, conf, helper, callProjectBuilderAndGulpTasks);

        } else {
            if (project.type === "custom") {

            } else if (project.type === "theme") {

                // Le theme est tellement différent qu"on lui fourni un objet de conf personnel
                themesBuilder.gulpTasks(gulp, project, conf, helper);
            } else {
                applicationAndModuleBuilder.gulpTasks(gulp, project, conf, helper);
            }
            callProjectBuilderAndGulpTasks();
        }
    });
};
