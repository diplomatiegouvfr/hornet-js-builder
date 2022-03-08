const chalk = require("chalk");
const log = require("fancy-log"); // remplacement gulp-util.log
const isFunction = require("lodash.isfunction");
const isUndefined = require("lodash.isundefined");
const prettyTime = require("pretty-hrtime");
const State = require("../builders/state");
const Task = require("../builders/tasks/task");
const helper = require("../helpers");

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
    // var LOG = 0;
    function extendGulp(gulp) {
        // on fait sauter la limite du nombre de listeners
        gulp.setMaxListeners(0);

        const tasksHistory = {};
        gulp.tasksHistory = tasksHistory;
        // Enrobe la fonction de déclaration des tache pour automatiser l'utilisation de run-sequence et gérer le cas du parent-builder
        const oldTaskFn = gulp.task;
        const oldParallelFn = gulp.parallel;
        const oldSeriesFn = gulp.series;

        gulp.task = function (taskName, deps, cb) {
            cb = Array.isArray(deps) ? cb : deps;
            cb = isFunction(cb)
                ? cb
                : function (done) {
                      done();
                  };
            deps = Array.isArray(deps) ? deps : [];

            let currentDir = process.cwd();
            const subModule = helper.getCurrentSubModule();
            if (subModule) {
                currentDir = subModule.dir;
                taskName += `/${subModule.name}`;
                deps.forEach(function (dep, idx) {
                    deps[idx] += `/${subModule.name}`;
                });
            }

            tasksHistory[taskName] = {
                deps: [],
                fn: isUndefined(cb)
                    ? function (done) {
                          done();
                      }
                    : cb,
            };

            if (deps.length > 0) {
                tasksHistory[taskName].deps = deps;
                oldTaskFn.call(gulp, taskName, function (done) {
                    const arr = tasksHistory[taskName].deps.slice(0);
                    helper.checkTasksExistence(gulp, arr);
                    try {
                        gulp.series(...arr)((err) => {
                            if (err) {
                                done(err);
                            } else {
                                tasksHistory[taskName].fn(done);
                            }
                        });
                    } catch (err) {
                        done(err);
                    }
                });
            } else {
                // oldTaskFn.call(gulp, taskName, deps, function(done) {
                oldTaskFn.call(gulp, taskName, function (done) {
                    if (Array.isArray(tasksHistory[taskName].deps) && tasksHistory[taskName].deps.length > 0) {
                        const arr = tasksHistory[taskName].deps.slice(0);
                        helper.checkTasksExistence(gulp, arr);
                        gulp.series(...arr)((err) => {
                            if (err) {
                                console.log("err", err);
                                done(err);
                            } else {
                                tasksHistory[taskName].fn(done);
                            }
                        });
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

        gulp.parallel = function (...tasksName) {
            const subModule = helper.getCurrentSubModule();
            let newTasksName = tasksName;
            if (subModule && Array.isArray(tasksName)) {
                newTasksName = tasksName.map((taskName) => {
                    return typeof taskName === "string" ? `${taskName}/${subModule.name}` : taskName;
                });
            }
            return oldParallelFn.call(gulp, ...newTasksName);
        };

        gulp.series = function (...tasksName) {
            const subModule = helper.getCurrentSubModule();
            let newTasksName = tasksName;
            if (subModule && Array.isArray(tasksName)) {
                newTasksName = tasksName.map((taskName) => {
                    return typeof taskName === "string" ? `${taskName}/${subModule.name}` : taskName;
                });
            }
            return oldSeriesFn.call(gulp, ...newTasksName);
        };

        function createPrePostTaskFn(taskName) {
            let name = taskName;
            let subName = "";
            const subModule = helper.getCurrentSubModule();
            let { deps } = tasksHistory[name];
            if (subModule) {
                name += `/${subModule.name}`;
                subName = `/${subModule.name}`;
                deps = tasksHistory[name].deps.map(removeSuffixeModule(subName));
            }

            const preTaskName = `pre-${taskName}`;
            const doTaskName = `do-${taskName}`;
            const postTaskName = `post-${taskName}`;

            if (typeof gulp._registry._tasks[taskName] === "undefined") {
                throw new Error(`La tâche '${name}' n'existe pas ou n'est pas compatible avec votre type de projet`);
            }

            if (
                typeof gulp._registry._tasks[preTaskName + subName] === "undefined" &&
                typeof gulp._registry._tasks[doTaskName + subName] === "undefined" &&
                typeof gulp._registry._tasks[postTaskName + subName] === "undefined"
            ) {
                // Génération de la tâche 'post'
                new Task(postTaskName, "", [], gulp, helper, null, null, (done) => {
                    return done();
                });

                // Génération de la tâche 'do' qui a la fonction d'origine
                new Task(doTaskName, "", deps, gulp, helper, null, null, tasksHistory[name].fn);

                // Génération de la tâche 'pre'
                new Task(preTaskName, "", [], gulp, helper, null, null, (done) => {
                    return done();
                });

                // Modification de la tâche d'origine, ordre : [pre-, deps originales ... , tache originale, post-]
                new Task(taskName, "", gulp.series(preTaskName, doTaskName, postTaskName), gulp, helper, null, null);
            }
        }

        function removeSuffixeModule(suffixe) {
            return (dep) => {
                if (dep.endsWith(suffixe)) {
                    return dep.substring(0, dep.indexOf(suffixe));
                }
                return dep;
            };
        }

        function rewriteTaskFn(gulp, taskName, taskFn) {
            const subModule = helper.getCurrentSubModule();
            if (subModule) {
                taskName += `/${subModule.name}`;
            }
            gulp.task(taskName, taskFn);
        }
        gulp.beforeTask = function (taskName, taskFn) {
            createPrePostTaskFn(taskName);
            rewriteTaskFn(gulp, `pre-${taskName}`, taskFn);
        };

        gulp.afterTask = function (taskName, taskFn) {
            createPrePostTaskFn(taskName);
            rewriteTaskFn(gulp, `post-${taskName}`, taskFn);
        };

        gulp.addTaskDependency = function (taskName, subTaskName, idx) {
            const moduleTaskName = taskName + (helper.getCurrentSubModule() ? `/${helper.getCurrentSubModule().name}` : "");
            const moduleSubTaskName = subTaskName + (helper.getCurrentSubModule() ? `/${helper.getCurrentSubModule().name}` : "");

            if (!gulp._registry._tasks[moduleTaskName] || isUndefined(tasksHistory[moduleTaskName])) {
                throw new Error(`La tâche '${taskName}' n'existe pas ou n'est pas compatible avec votre type de projet`);
            }
            if (!gulp._registry._tasks[moduleSubTaskName] || isUndefined(tasksHistory[moduleSubTaskName])) {
                throw new Error(`La sous-tâche '${moduleSubTaskName}' n'existe pas`);
            }
            idx = isUndefined(idx) ? tasksHistory[moduleTaskName].deps.length : idx;
            tasksHistory[moduleTaskName].deps.splice(idx, 0, moduleSubTaskName);
            // gulp.task(taskName, tasksHistory[moduleTaskName].deps, tasksHistory[moduleTaskName].fn)
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
    let failed = false;
    process.once("exit", function (code) {
        if (State.result) {
            console.log(State.result);
        }
        if (code === 0 && failed) {
            process.exit(code);
        }
    });

    // wire up logging events
    function logEvents(gulpInst) {
        let inc = 0;

        // total hack due to poor error management in orchestrator
        gulpInst.on("err", function () {
            failed = true;
        });
        gulpInst.on("start", function (e) {
            // TODO: batch these
            // so when 5 tasks start at once it only logs one time with all 5
            inc++;
            const logShift = "_".repeat(inc);
            !helper.isSilent() && log(`${logShift}Starting`, `'${chalk.cyan(e.name || e.task)}'...`);
        });

        gulpInst.on("stop", function (e) {
            const logShift = "_".repeat(inc);
            inc--;
            const time = prettyTime(e.duration);
            !helper.isSilent() && log(`${logShift}Finished`, `'${chalk.cyan(e.name || e.task)}'`, "after", chalk.magenta(time));
        });

        gulpInst.on("error", function (e) {
            if (e && e.err && e.err.console) {
                log(e.err.data);
            } else {
                const msg = formatError(e.error);
                const time = prettyTime(e.duration);
                log(`'${chalk.cyan(e.name || e.task)}'`, chalk.red("errored after"), chalk.magenta(time));
                log(msg);
            }
        });

        gulpInst.on("task_not_found", function (err) {
            log(chalk.red(`Task '${err.task}' is not in your gulpfile`));
            log("Please check the documentation for proper gulpfile formatting");
            process.exit(1);
        });
    }

    extendGulp(gulp);
    logEvents(gulp);
};
