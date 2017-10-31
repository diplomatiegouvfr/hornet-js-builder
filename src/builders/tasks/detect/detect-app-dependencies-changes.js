"use strict";
const path = require("path");

const Task = require("./../task");
const State = require("./../../state");

class DetectAppDependenciesChanges extends Task {

    task(gulp, helper, conf, project) {
        return (done) => {
            let root = project.packageJson;
            let hash = helper.getDependenciesHash(root);
            let diff = false;
            if (root[helper.APP_DEPENDENCIES] && Object.keys(root[helper.APP_DEPENDENCIES]).length > 0 && (
                !(helper.HB_JSON_KEY in root) ||
                !("current" in root[helper.HB_JSON_KEY]) ||
                !("history" in root[helper.HB_JSON_KEY]) ||
                !(hash in root[helper.HB_JSON_KEY].history) ||
                hash != root[helper.HB_JSON_KEY].current)) {

                helper.info("Modification détectée sur les dépendances > on recalcule les dépendances (new_hash="+hash+")");
                diff = true;
            } else {
                if (root[helper.APP_DEPENDENCIES] && Object.keys(root[helper.APP_DEPENDENCIES]).length > 0 && (
                    !helper.folderExists(path.join(project.dir, helper.NODE_MODULES)) ||
                    !helper.folderExists(path.join(project.dir, helper.NODE_MODULES_APP)))) {

                    helper.info("Dépendances à installer");
                    diff = true;
                } else if (helper.isForce()) {

                    helper.info("Dépendances à réinstaller en force");
                    diff = true;
                } else {
                    helper.info("Dépendances à jour > rien à faire (si ce n'est pas le cas ajouter l'option -f pour forcer la réinstallation des dépendances)");
                }
            }
            State.appDependenciesChanged = diff;
            done();
        }
    }
}


module.exports = DetectAppDependenciesChanges;
