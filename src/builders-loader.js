const path = require("path");
const chalk = require("chalk");
const gulp = require("gulp");
const isfunction = require("lodash.isfunction");
const merge = require("lodash.merge");

// Les builders
const applicationAndModuleBuilder = require("./builders/application-and-module-builder.js");
const commonTaskBuilder = require("./builders/common-tasks-builder");
const parentBuilder = require("./builders/parent-builder");
const State = require("./builders/state");
const helper = require("./helpers");

Error.stackTraceLimit = Infinity;
module.exports = function (project, done) {
    const conf = {
        baseDir: project.dir,
    };

    function callProjectBuilderAndGulpTasks() {
        if (isfunction(project.builderJs.gulpTasks)) {
            helper.debug("Execution de la fonction 'gulpTasks' fournie par le projet");
            project.builderJs.gulpTasks(gulp, project, conf, helper);
        } else {
            helper.debug("Pas de fonction 'gulpTasks' fournie par le projet");
        }

        // lancement des tâches gulp
        // done();
    }

    helper.info(chalk.cyan(`Chargement des tâches du projet '${project.name}'`));
    return new Promise((resolve, reject) => {
        // init : on déclare le répertoire temporairement le temps de charger le fichier "builder.js" du projet
        require("./module-resolver");

        // on install les dépendances de test dans le cas ou le builder.js comprend des requieres vers des modules

        project.builderJs = require(helper.getBuilder(project.dir));
        project.type = project.builderJs.type;

        merge(conf, project.builderJs.config);

        // on charge les tâche gulp prédéfinies par hornet-js-builder
        commonTaskBuilder.gulpTasks(gulp, project, conf, helper);
        if (project.type === helper.TYPE.PARENT) {
            State.parentBuilder.externalModules = project.builderJs.externalModules;
            applicationAndModuleBuilder.gulpTasks(gulp, project, conf, helper);
            parentBuilder.gulpTasks(gulp, project, conf, helper, () => {
                if (helper.isPreInstallDev()) {
                    require("run-sequence").apply(
                        gulp,
                        ["dependencies:install-dev"].concat(function (err) {
                            callProjectBuilderAndGulpTasks();
                            if (err) {
                                reject(err);
                            }
                            resolve();
                        }),
                    );
                } else {
                    callProjectBuilderAndGulpTasks();
                    resolve();
                }
            });
        } else {
            if (project.type !== helper.TYPE.CUSTOM) {
                applicationAndModuleBuilder.gulpTasks(gulp, project, conf, helper);
            }
            if (helper.isPreInstallDev()) {
                require("run-sequence").apply(
                    gulp,
                    ["dependencies:install-dev"].concat(function (err) {
                        callProjectBuilderAndGulpTasks();
                        if (err) {
                            reject(err);
                        }
                        resolve();
                    }),
                );
            } else {
                callProjectBuilderAndGulpTasks();
                resolve();
            }
        }
    })
        .catch((err) => {
            console.error(err);
        })
        .then(() => {
            done();
        });
};
