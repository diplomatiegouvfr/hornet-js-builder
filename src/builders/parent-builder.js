"use strict";
var helper = require("../helpers");
var path = require("path");
var fs = require("fs");
var _ = require("lodash");
var promise = require("promise");

/**
 * Builder ajoutant les tâches gulp nécessaires à la construction d'un module de type 'parent'
 * - Parcourt les sous modules
 * - Crée des liens symboliques entre les sous modules
 * - Lance le goal demandé sur chacun des sous modules
 *
 * @type {{gulpTasks: Function}}
 */
module.exports = {
    gulpTasks: function (gulp, project, conf, helper, loadedCb) {

        var moduleList = helper.getModuleList(project.dir);
        //Extraction des dépendances entre les modules
        moduleList.forEach(function (mod) {
            mod.dependencies = [];
            var json = mod.packageJson;
            var dep = json[helper.APP_DEPENDENCIES] || {};
            var testDep = json[helper.TEST_DEPENDENCIES] || {};

            moduleList.forEach(function (dependent) {
                if (dep[dependent.name] || testDep[dependent.name]) {
                    mod.dependencies.push(dependent.name);
                }
            });
        });

        // on trie les modules de façon à gérer les inter-dépendances
        moduleList.sort(function(p1, p2) {
            return (p1.dependencies.indexOf(p2.name) != -1) ? -1 : 1
        });
        moduleList.reverse();
        helper.debug("Modules trouvés :", moduleList);

        // on charge toutes les task pour tous les modules
        var p = promise.resolve();

        moduleList.forEach(function(project) {
            p = p.then(function(resolve, reject) {
                return helper.loadSubModuleTasks(helper.getProject(project.dir));
            });
        });
        p = p.then(function(resolve, reject) {
            // on map chaque tâche gulp existante par l'exécution de cette tâche sur tous les modules qui la possède
            helper.each(gulp.tasks, function (task, taskName) {
                if (taskName.indexOf("/") != -1) return;
                var subProjectTasks = [];
                moduleList.forEach(function (project) {
                    if (gulp.hasTask(taskName + "/" + project.name)) {
                        subProjectTasks.push(taskName + "/" + project.name);
                    }
                });
                gulp.task(taskName, subProjectTasks);
            });
        });
        p.catch(function(err) {
            helper.error("Erreur durant le chargement des tâches du module : " + err);
            process.exit(1);
        });
        p = p.then(function(resolve, reject) {
            helper.debug("Chargement des tâche du parent et des modules terminé")
            loadedCb();
        });
    }
};
