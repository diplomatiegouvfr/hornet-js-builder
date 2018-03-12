"use strict";

const State = require("./../state");

class Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {

        this.name = name;
        this.taskDepend = taskDepend;
        this.taskDependencies = taskDependencies;
        this.project = project;

        // Gestion du resolving des modules issus du parent
        if(!State.externalDependencies || !State.externalDependencies[project.name]) {
            State.externalDependencies[project.name] = {};
            if((project.builderJs.externalModules && project.builderJs.externalModules.enabled) || (State.parentBuilder.externalModules && State.parentBuilder.externalModules.enabled) || !helper.isMultiType()) { 
                helper.getExternalModules(project).forEach(function (mod) {
                    State.externalDependencies[project.name][mod.name] = mod;
                    helper.info("Auto resolving module externe '" + mod.name + "@" + mod.version + " in '" + mod.dir + "'");
                });
            }
        }

        gulp.task(this.name, this.taskDependencies, this.task(gulp, helper, conf, project));
        this.addTaskDepend(gulp);
    }

    addTaskDepend(gulp) {
        if (this.taskDepend) {
            try {
                gulp.addTaskDependency(this.taskDepend, this.name);
            } catch(err) {
                throw new Error("Erreur lors de l'ajout des dépendances pour La tâche '" + this.name + " : " + err.message);
            }
        }
    }

    /**
     * méthode appelée à l'initialisation d'une task
     * @returns {Function} tache Gulp exécutée
     */
    task() {
        throw new Error("La tâche '" + this.name + "' ne surcharge pas la méthode 'task'");
    }
}


module.exports = Task;
