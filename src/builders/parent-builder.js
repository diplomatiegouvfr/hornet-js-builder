const fs = require("fs");
const path = require("path");
const cloneDeep = require("lodash.clonedeep");
const State = require("./state");
const ListChildModules = require("./tasks/dependencies/list-child-modules");
const FixDependencyVersion = require("./tasks/version/fix-dependency-version");
const FixVersion = require("./tasks/version/fix-version");

/**
 * Builder ajoutant les tâches gulp nécessaires à la construction d'un module de type 'parent'
 * - Parcourt les sous modules
 * - Crée des liens symboliques entre les sous modules
 * - Lance le goal demandé sur chacun des sous modules
 *
 * @type {{gulpTasks: Function}}
 */
module.exports = {
    gulpTasks(gulp, project, conf, helper, loadedCb) {
        new FixVersion(`versions:set/${helper.TYPE.PARENT}`, "", [], gulp, helper, conf, project);
        new FixDependencyVersion(`dependency:set/${helper.TYPE.PARENT}`, "", [], gulp, helper, conf, project);

        /* dependance entre des types applications et des types modules */
        const taskDeps = {};

        if (helper.getRegistry() || helper.getPublishRegistry()) {
            taskDeps.package = ["publish"];
        }

        helper.debug("recherche des modules dans : ", project.dir);
        const moduleList = helper.getModuleList(project.dir);

        // Extraction des dépendances entre les modules
        moduleList.forEach(function (mod) {
            mod.dependencies = [];
            const json = mod.packageJson;
            const dep = json[helper.DEPENDENCIES] || {};
            const testDep = json[helper.DEV_DEPENDENCIES] || {};

            moduleList.forEach(function (dependent) {
                if (dep[dependent.name] || testDep[dependent.name]) {
                    mod.dependencies.push(dependent.name);
                }
            });
        });

        // on trie les modules de façon à gérer les inter-dépendances
        moduleList.sort(function (p1, p2) {
            return p1.dependencies.indexOf(p2.name) != -1 ? -1 : 1;
        });
        moduleList.sort(function (p1, p2) {
            return p1.dependencies.indexOf(p2.name) != -1 ? -1 : 1;
        });

        moduleList.reverse();
        helper.debug("Modules trouvés :", moduleList);
        const subProjectTypes = {};
        moduleList.forEach(function (childProject) {
            State.moduleList[childProject.name] = cloneDeep(childProject);
            if (childProject.type) {
                subProjectTypes[childProject.type] = true;
            }
        });

        helper.setMultiType(
            subProjectTypes[helper.TYPE.MODULE] && (subProjectTypes[helper.TYPE.APPLICATION] || subProjectTypes[helper.TYPE.APPLICATION_SERVER]),
        );
        helper.debug("multi module type : ", helper.isMultiType(), " types : ", subProjectTypes);
        new ListChildModules("modules:list", "", [], gulp, helper, conf, project, moduleList);
        // on charge toutes les task pour tous les modules
        let p = Promise.resolve();

        moduleList.forEach(function (childProject) {
            p = p.then(function (resolve, reject) {
                return helper.loadSubModuleTasks(helper.getProject(childProject.dir));
            });
        });
        p = p.then(function (resolve, reject) {
            // on map chaque tâche gulp existante par l'exécution de cette tâche sur tous les modules qui la possède
            helper.each(gulp._registry._tasks, function (task, taskName) {
                if (taskName.indexOf("/") != -1) return;

                // exlusion de module
                if (taskName === "versions:get") return;
                if (taskName === "modules:list") return;

                const subProjectTasks = [];

                // chargement des differents types de projet dans un parent
                // pour rajouter des dependances de tache

                moduleList.forEach(function (childProject) {
                    if (gulp._getTask(`${taskName}/${childProject.name}`)) {
                        subProjectTasks.push(`${taskName}/${childProject.name}`);
                    }
                    if (
                        (childProject.builderJs.type === helper.TYPE.MODULE || childProject.builderJs.type === helper.TYPE.CUSTOM) &&
                        subProjectTypes[helper.TYPE.APPLICATION] &&
                        subProjectTypes[helper.TYPE.APPLICATION_SERVER] &&
                        taskDeps[taskName]
                    ) {
                        taskDeps[taskName].forEach((modulesTasksDeps) => {
                            if (gulp._getTask(`${modulesTasksDeps}/${childProject.name}`)) {
                                subProjectTasks.push(`${modulesTasksDeps}/${childProject.name}`);
                            }
                        });
                    }
                });

                if (gulp._getTask(`${taskName}/${helper.TYPE.PARENT}`)) {
                    subProjectTasks.splice(1, 0, `${taskName}/${helper.TYPE.PARENT}`);
                }
                // gulp.serie
                gulp.task(taskName, subProjectTasks);
            });
        });
        p.catch(function (err) {
            helper.error(`Erreur durant le chargement des tâches du module : ${err}`);
            process.exit(1);
        });
        p = p.then(function (resolve, reject) {
            helper.debug("Chargement des tâche du parent et des modules terminé");
            loadedCb();
        });
    },
};
