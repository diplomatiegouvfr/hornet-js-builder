"use strict";
var helper = require("./helpers");
var path = require("path");
var chalk = require("chalk");
const isfunction = require ("lodash.isfunction");
const merge = require ("lodash.merge");

Error.stackTraceLimit = Infinity;
var gulp = require("gulp");

// Les builders
var parentBuilder = require("./builders/parent-builder");
var commonTaskBuilder = require("./builders/common-tasks-builder");
var applicationAndModuleBuilder = require("./builders/application-and-module-builder.js");
const State = require("./builders/state");

module.exports = function (project, done) {

    var conf = {
        baseDir: project.dir
    };

    
    function callProjectBuilderAndGulpTasks() {
        if (isfunction(project.builderJs.gulpTasks)) {
            helper.debug("Execution de la fonction 'gulpTasks' fournie par le projet");
            project.builderJs.gulpTasks(gulp, project, conf, helper);
        } else {
            helper.debug("Pas de fonction 'gulpTasks' fournie par le projet")
        }

        // lancement des tâches gulp
        //done();
    }

    helper.info(chalk.cyan("Chargement des tâches du projet '" + project.name + "'"));
    return new Promise((resolve, reject) => {
        
        // on déclare le répertoire temporairement le temps de charger le fichier "builder.js" du projet
        const moduleResolver = require("./module-resolver");

        //on install les dépendances de test dans le cas ou le builder.js comprend des requieres vers des modules

        project.builderJs = require(path.join(project.dir, helper.BUILDER_FILE));
        project.type = project.builderJs.type;

        merge(conf, project.builderJs.config);

        // on charge les tâche gulp prédéfinies par hornet-js-builder
        commonTaskBuilder.gulpTasks(gulp, project, conf, helper);
        if (project.type === helper.TYPE.PARENT) {
            State.parentBuilder.externalModules = project.builderJs.externalModules;
            applicationAndModuleBuilder.gulpTasks(gulp, project, conf, helper);
            parentBuilder.gulpTasks(gulp, project, conf, helper, () => {
                if(helper.isPreInstallDev()) {
                    require("run-sequence").apply(gulp, ["dependencies:install-dev"].concat(
                        function (err) {
                            callProjectBuilderAndGulpTasks();
                            if (err) {
                                reject(err)
                            }
                            resolve();
                        }
                    ));
                } else {
                    callProjectBuilderAndGulpTasks() & resolve();
                }
            });
        } else {
            if (project.type === helper.TYPE.CUSTOM) {

            } else {
                applicationAndModuleBuilder.gulpTasks(gulp, project, conf, helper);
            }
            if(helper.isPreInstallDev()) {
                require("run-sequence").apply(gulp, ["dependencies:install-dev"].concat(
                    function (err) {
                        callProjectBuilderAndGulpTasks();
                        if (err) {
                            reject(err)
                        }
                        resolve();
                    }
                ));
            } else {
                callProjectBuilderAndGulpTasks() & resolve();
            }
        }
    }).catch((err) => {
        console.error(err);
    }).then(()=> {
        done();
    });
};
