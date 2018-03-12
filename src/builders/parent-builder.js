"use strict";

var path = require("path");
var fs = require("fs");
var _ = require("lodash");
const State = require("./state");

const FixVersion = require("./tasks/version/fix-version");
const FixDependencyVersion = require("./tasks/version/fix-dependency-version");
const GetLastVersion = require("./tasks/version/get-last-version");

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
        new FixVersion("versions:set/" + helper.TYPE.PARENT, "", [], gulp, helper, conf, project);
        new FixDependencyVersion("dependency:set/" + helper.TYPE.PARENT, "", [], gulp, helper, conf, project);

        /* dependance entre des types applications et des types modules */
        var taskDeps = {};
        
        if (helper.getRegistry() || helper.getPublishRegistry()) {
            taskDeps.package = ["publish"];
        }

        helper.debug("recherche des modules dans : ", project.dir);
        var moduleList = helper.getModuleList(project.dir);
        helper.debug("moduleList : ", moduleList);

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
        // on trie les modules de façon à gérer les dts
        let moduleListDts = moduleList.filter((elt) => {return elt.name.endsWith("-dts")});
        let idxDTS = [];
        moduleList = moduleList.filter((elt) => {return !elt.name.endsWith("-dts")});
        moduleListDts.forEach((elt, idx) => {
            moduleList.every((eltM, idxM) => {
                if(elt.name.substring(0, elt.name.length -4) == eltM.name) {
                    moduleList.splice(idxM, 0, elt);
                    idxDTS.push(idx);
                    return false;
                }
                return true;
            });
        });

        // on ajoute les projet DTS non trouvé
        idxDTS.forEach((elt) => {
            moduleListDts.splice(0, 1);
        });
        Array.prototype.push.apply(moduleList, moduleListDts)     

        moduleList.reverse();
        helper.debug("Modules trouvés :", moduleList);
        var subProjectTypes = {};
        moduleList.forEach(function (project) {
            State.moduleList[project.name] = _.cloneDeep(project)
            if (project.type) {
                subProjectTypes[project.type] = true;
            }
        });
        
        helper.setMultiType(subProjectTypes[helper.TYPE.MODULE] && (subProjectTypes[helper.TYPE.APPLICATION] || subProjectTypes[helper.TYPE.APPLICATION_SERVER]));
        helper.debug("multi module type : ", helper.isMultiType(), " types : ", subProjectTypes);
        
        // on charge toutes les task pour tous les modules
        var p = Promise.resolve();

        moduleList.forEach(function(project) {
            p = p.then(function(resolve, reject) {
                return helper.loadSubModuleTasks(helper.getProject(project.dir));
            });
        });
        p = p.then(function(resolve, reject) {
            // on map chaque tâche gulp existante par l'exécution de cette tâche sur tous les modules qui la possède
            helper.each(gulp.tasks, function (task, taskName) {
                if (taskName.indexOf("/") != -1) return;

                //exlusion de module
                if(taskName === "versions:get") return;

                var subProjectTasks = [];
                
                // chargement des differents types de projet dans un parent
                // pour rajouter des dependances de tache

                 moduleList.forEach(function (project) {
                    if (gulp.hasTask(taskName + "/" + project.name)) {
                        subProjectTasks.push(taskName + "/" + project.name);
                    }
                    if ((project.builderJs.type === helper.TYPE.MODULE || project.builderJs.type === helper.TYPE.CUSTOM) && subProjectTypes[helper.TYPE.APPLICATION] && subProjectTypes[helper.TYPE.APPLICATION_SERVER] && taskDeps[taskName]) {
                        taskDeps[taskName].forEach((modulesTasksDeps) => {
                            if (gulp.hasTask(modulesTasksDeps + "/" + project.name)) {
                                subProjectTasks.push(modulesTasksDeps + "/" + project.name);
                            }
                        });
                    } 
                });

                if (gulp.hasTask(taskName + "/" + helper.TYPE.PARENT)) {
                    subProjectTasks.splice(1, 0, taskName + "/" + helper.TYPE.PARENT);
                }

                gulp.task(taskName, subProjectTasks);
            });
        });
        p.catch(function(err) {
            helper.error("Erreur durant le chargement des tâches du module : " + err);
            process.exit(1);
        });
        p = p.then(function(resolve, reject) {
            helper.debug("Chargement des tâche du parent et des modules terminé");
            loadedCb();
        });
    }
};
