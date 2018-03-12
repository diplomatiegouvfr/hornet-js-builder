'use strict';

var chalk = require("chalk");
var _ = require("lodash");
var gutil = require("gulp-util");
var prettyTime = require("pretty-hrtime");
var helper = require("../helpers");
const State = require("../builders/state");
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
                    
                        
                    if ( _.isArray(tasksHistory[taskName].deps) &&  tasksHistory[taskName].deps.length > 0 ) {
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
                    } else {
                        try {
                            tasksHistory[taskName].fn(done);
                        } catch (err) {
                            done(err);
                        }
                    }



                });
            }
        };

        function createPrePostTaskFn(taskName) {
            let name = taskName;
            let subName = "";
            let subModule = helper.getCurrentSubModule();
            let deps = tasksHistory[name].deps;
            if (subModule) {
                name += ("/" + subModule.name);
                subName = "/" + subModule.name;
                deps = tasksHistory[name].deps.map(removeSuffixeModule(subName))
            }

            var gulpTask = gulp.tasks[taskName];
            var preTaskName = "pre-" + taskName;
            var doTaskName = "do-" + taskName;
            var postTaskName = "post-" + taskName;



            if (_.isUndefined(gulpTask)) {
                throw new Error("La tâche '" + name + "' n'existe pas");
            }

            if (_.isUndefined(gulp.tasks[preTaskName+subName]) && _.isUndefined(gulp.tasks[doTaskName+subName]) && _.isUndefined(gulp.tasks[postTaskName+subName])) {
                // Génération de la tâche 'post'
                gulp.task(postTaskName, [], function(done){return done()});

                // Génération de la tâche 'do' qui a la fonction d'origine
                gulp.task(doTaskName, tasksHistory[name].fn);

                // Génération de la tâche 'pre'
                gulp.task(preTaskName, [], function(done){return done()});

                // Modification de la tâche d'origine, ordre : [pre-, deps originales ... , tache originale, post-]
                gulp.task(taskName, [preTaskName].concat(deps).concat([doTaskName, postTaskName]));
            }
        }

        function removeSuffixeModule(suffixe) {
            return (dep) => {
                if (dep.endsWith(suffixe)) {
                    return dep.substring(0, dep.indexOf(suffixe));
                }
                return dep;
            }
        }

        function rewriteTaskFn(gulp, taskName, taskFn) {
            let subModule = helper.getCurrentSubModule();
            if (subModule) {
                taskName += ("/" + subModule.name);
            }
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
                throw new Error("La sous-tâche '" + moduleSubTaskName + "' n'existe pas");
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
        if(State.result) {
            console.log(State.result);
        }
        if (code === 0 && failed) {
            process.exit(code);
        }
    });

    // wire up logging events
    function logEvents(gulpInst) {
        var inc = 0;

        // total hack due to poor error management in orchestrator
        gulpInst.on("err", function () {
            failed = true;
        });
        gulpInst.on("task_start", function (e) {
            // TODO: batch these
            // so when 5 tasks start at once it only logs one time with all 5
            inc++;
            let logShift = "_".repeat(inc);
            gutil.log(logShift + "Starting", "'" + chalk.cyan(e.task) + "'...");

        });

        gulpInst.on("task_stop", function (e) {
            let logShift = "_".repeat(inc);
            inc--;
            var time = prettyTime(e.hrDuration);
            gutil.log(logShift + 
                "Finished", "'" + chalk.cyan(e.task) + "'",
                "after", chalk.magenta(time)
            );
        });

        gulpInst.on("task_err", function (e) {
            if(e && e.err && e.err.console) {
                gutil.log(e.err.data);
            } else {
                var msg = formatError(e);
                var time = prettyTime(e.hrDuration);
                gutil.log(
                    "'" + chalk.cyan(e.task) + "'",
                    chalk.red("errored after"),
                    chalk.magenta(time)
                );
                gutil.log(msg);
            }
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

