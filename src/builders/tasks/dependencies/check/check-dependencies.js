"use strict";

const Task = require("../../task");

class CheckDependencies extends Task {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, keyDependency) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.keyDependency = keyDependency;
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            var root = project.packageJson;
            var ok = true;
            helper.each(root[this.keyDependency], (version, key) => {
                if (!helper.isValidVersion(version, key)) {
                    if (project.builderJs.authorizedPrerelease) {
                        helper.warn("Mode authorizedPrerelease activé, Version '" + version + "' interdite pour la dépendance en production'" + key + "' ==> vous devez utiliser une version figée");
                    } else {
                        ok = false;
                        helper.error("Version '" + version + "' interdite pour la dépendance '" + key + "' ==> vous devez utiliser une version figée");
                    }
                }
            });
            if (ok) done();
            else {
                throw new Error("Erreur de versions")
            }
        }
    }
}


module.exports = CheckDependencies;
