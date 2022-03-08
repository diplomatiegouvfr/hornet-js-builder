const chalk = require("chalk");
const prettyTime = require("pretty-hrtime");
const Helper = require("../../helpers");
const State = require("../state");

const taskList = [];

class Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, task, message) {
        this.name = name;
        this.taskDepend = taskDepend;
        this.taskDependencies = taskDependencies;
        this.project = project;
        this.message = message;

        // Gestion du resolving des modules issus du parent
        if (project && (!State.externalDependencies || !State.externalDependencies[project.name])) {
            State.externalDependencies[project.name] = {};
            if (
                (project.builderJs.externalModules && project.builderJs.externalModules.enabled) ||
                (State.parentBuilder.externalModules && State.parentBuilder.externalModules.enabled) ||
                helper.isActiveExternal()
            ) {
                helper.getExternalModules(project).forEach((mod) => {
                    State.externalDependencies[project.name][mod.name] = mod;
                    helper.info(`Auto resolving module externe '${mod.name}@${mod.version} in '${mod.dir}'`);
                });
            }
        }

        gulp.task(this.name, this.taskDependencies, task || this.task(gulp, helper, conf, project));
        // gulp.task(this.name, task? task:this.task(gulp, helper, conf, project));

        this.addTaskDepend(gulp);

        const taskExist = taskList.find((taskElement) => {
            return taskElement === this.name;
        });

        if (!taskExist) {
            taskList.push(this.name);
            // helper.getCommander().command(this.name, helper.getTaskInfo(this.name));
        }
    }

    addTaskDepend(gulp) {
        if (this.taskDepend) {
            try {
                gulp.addTaskDependency(this.taskDepend, this.name);
            } catch (err) {
                throw new Error(`Erreur lors de l'ajout des dépendances pour La tâche '${this.name} : ${err.message}`);
            }
        }
    }

    /**
     * méthode appelée à l'initialisation d'une task
     * @returns {Function} tache Gulp exécutée
     */
    task(gulp, helper) {
        if (this.message) {
            return (done) => {
                helper.info(`${"\n\n" + "  Information utilisateur :\n" + " --------------------------\n" + "\n"}${this.message}\n\n`);
                done();
            };
        }
        return (done) => {
            helper.debug(`${this.name} nothing to do !`);
            done();
        };
        // throw new Error("La tâche '" + this.name + "' ne surcharge pas la méthode 'task'");
    }

    /**
     * méthode appelée à l'initialisation d'une task
     * @returns {Function} tache Gulp exécutée
     */
    passIfAlreadyExec(done, project) {
        if (State.taskHistory[`${project.name}:${this.name}`]) {
            Helper.info("Tache déjà exécutée il y a :", prettyTime(process.hrtime(State.taskHistory[`${project.name}:${this.name}`])));
            return true;
        }
        State.taskHistory[`${project.name}:${this.name}`] = process.hrtime();
        // throw new Error("La tâche '" + this.name + "' ne surcharge pas la méthode 'task'");
    }
}

module.exports = Task;
