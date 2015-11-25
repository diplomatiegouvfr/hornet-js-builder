'use strict';

var chalk = require("chalk");
var _ = require("lodash");
var gutil = require("gulp-util");
var prettyTime = require("pretty-hrtime");
var helper = require("../helpers");
var runSequence = require("run-sequence");

module.exports = function (gulp) {

    /**
     * Ajoute les fonctions suivantes à gulp:
     * <ul>
     *     <li>
     *     beforeTask: Ajoute l'exécution d'une fonction avant la tâche passée en paramètre (une tache 'pre-' + taskName est générée)
     *      </li>
     *      <li>
     *     afterTask: Ajoute l'exécution d'une fonction après la tâche passée en paramètre (une tache 'post-' + taskName est générée)
     *      </li>
     * </ul>
     * @param gulp
     */
    //var LOG = 0;
    function extendGulp(gulp) {
        // on fait sauter la limite du nombre de listeners
        gulp.setMaxListeners(0);

        var tasksHistory = {};
        gulp.tasksHistory = tasksHistory;
        // Enrobe la fonction de déclaration des tache pour automatiser l'utilisation de run-sequence et gérer le cas du parent-builder
        var oldTaskFn = gulp.task;
        gulp.task = function(taskName, deps, cb) {
            cb = _.isArray(deps) ? cb : deps;
            cb = _.isFunction(cb) ? cb : function(done){done();};
            deps = _.isArray(deps) ? deps : [];

            var currentDir = process.cwd();
            var subModule = helper.getCurrentSubModule();
            if (subModule) {
                currentDir = subModule.dir;
                taskName += ("/" + subModule.name);
                deps.forEach(function(dep, idx) {
                    deps[idx] += ("/" + subModule.name);
                });
            }

            tasksHistory[taskName] = {
                deps: [],
                fn: _.isUndefined(cb) ? function(done) { done(); } : cb
            };

            if (deps.length > 0) {
                tasksHistory[taskName].deps = deps;
                oldTaskFn.call(gulp, taskName, function(done) {
                    var arr = tasksHistory[taskName].deps.slice(0);
                    helper.checkTasksExistence(gulp, arr);
                    arr.push(function(err) {
                        if (err) {
                            done(err);
                        } else {
                            tasksHistory[taskName].fn(done);
                        }
                    });
                    try {
                        runSequence.apply(this, arr);
                    } catch (err) {
                        done(err);
                    }
                });

            } else {
                oldTaskFn.call(gulp, taskName, deps, function(done) {
                    process.chdir(currentDir);
                    try {
                        tasksHistory[taskName].fn(done);
                    } catch (err) {
                        done(err);
                    }
                });
            }
        };

        function createPrePostTaskFn(taskName) {
            var gulpTask = gulp.tasks[taskName];
            var preTaskName = "pre-" + taskName;
            var doTaskName = "do-" + taskName;
            var postTaskName = "post-" + taskName;

            if (_.isUndefined(gulpTask)) {
                throw new Error("La tâche '" + taskName + "' n'existe pas");
            }

            if (_.isUndefined(gulp.tasks[preTaskName]) && _.isUndefined(gulp.tasks[doTaskName]) && _.isUndefined(gulp.tasks[postTaskName])) {
                // Génération de la tâche 'post'
                gulp.task(postTaskName, [], function(){});

                // Génération de la tâche 'do' qui a la fonction d'origine
                gulp.task(doTaskName, tasksHistory[taskName].fn);

                // Génération de la tâche 'pre'
                gulp.task(preTaskName, [], function(){});

                // Modification de la tâche d'origine, ordre : [pre-, deps originales ... , tache originale, post-]
                gulp.task(taskName, [preTaskName].concat(tasksHistory[taskName].deps).concat([doTaskName, postTaskName]));
            }
        }

        function rewriteTaskFn(gulp, taskName, taskFn) {
            gulp.tasks[taskName].fn = taskFn || function () {}; // no-op;
        }

        gulp.beforeTask = function (taskName, taskFn) {
            createPrePostTaskFn(taskName);
            rewriteTaskFn(gulp, "pre-" + taskName, taskFn);
        };

        gulp.afterTask = function (taskName, taskFn) {
            createPrePostTaskFn(taskName);
            rewriteTaskFn(gulp, "post-" + taskName, taskFn);
        };

        gulp.addTaskDependency = function(taskName, subTaskName, idx) {
            var moduleTaskName = taskName + (helper.getCurrentSubModule() ? ("/" + helper.getCurrentSubModule().name) : "");
            var moduleSubTaskName = subTaskName + (helper.getCurrentSubModule() ? ("/" + helper.getCurrentSubModule().name) : "");

            if (_.isUndefined(gulp.tasks[moduleTaskName]) || _.isUndefined(tasksHistory[moduleTaskName])) {
                throw new Error("La tâche '" + taskName + "' n'existe pas");
            }
            if (_.isUndefined(gulp.tasks[moduleSubTaskName]) || _.isUndefined(tasksHistory[moduleSubTaskName])) {
                throw new Error("La tâche '" + moduleSubTaskName + "' n'existe pas");
            }
            idx = _.isUndefined(idx) ? tasksHistory[moduleTaskName].deps.length : idx;
            tasksHistory[moduleTaskName].deps.splice(idx, 0, moduleSubTaskName);
            //gulp.task(taskName, tasksHistory[moduleTaskName].deps, tasksHistory[moduleTaskName].fn)
        };
    }


    // format orchestrator errors
    function formatError(e) {
        if (!e.err) {
            return e.message;
        }

        // PluginError
        if (typeof e.err.showStack === "boolean") {
            return e.err.toString();
        }

        // normal error
        if (e.err.stack) {
            return e.err.stack;
        }

        // unknown (string, number, etc.)
        return new Error(String(e.err)).stack;
    }


    // exit with 0 or 1
    var failed = false;
    process.once("exit", function (code) {
        if (code === 0 && failed) {
            process.exit(1);
        }
    });

    // wire up logging events
    function logEvents(gulpInst) {
        // total hack due to poor error management in orchestrator
        gulpInst.on("err", function () {
            failed = true;
        });

        gulpInst.on("task_start", function (e) {
            // TODO: batch these
            // so when 5 tasks start at once it only logs one time with all 5
            gutil.log("Starting", "'" + chalk.cyan(e.task) + "'...");
        });

        gulpInst.on("task_stop", function (e) {
            var time = prettyTime(e.hrDuration);
            gutil.log(
                "Finished", "'" + chalk.cyan(e.task) + "'",
                "after", chalk.magenta(time)
            );
        });

        gulpInst.on("task_err", function (e) {
            var msg = formatError(e);
            var time = prettyTime(e.hrDuration);
            gutil.log(
                "'" + chalk.cyan(e.task) + "'",
                chalk.red("errored after"),
                chalk.magenta(time)
            );
            gutil.log(msg);
        });

        gulpInst.on("task_not_found", function (err) {
            gutil.log(
                chalk.red("Task '" + err.task + "' is not in your gulpfile")
            );
            gutil.log("Please check the documentation for proper gulpfile formatting");
            process.exit(1);
        });
    }

    extendGulp(gulp);
    logEvents(gulp);
};

