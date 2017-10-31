"use strict";
const path = require("path");
const fs = require("fs");

const Task = require("./../task");


class CleanFixedDependencies extends Task {

    task(gulp, helper, conf, project) {
        return (done) => {
            let ok = true;
            if (helper.isForce()) {
                let packageJsonPath = path.join(project.dir, "package.json");
                let root = project.packageJson;
                delete root[helper.HB_JSON_KEY];
                fs.writeFile(packageJsonPath, JSON.stringify(root, null, 2), (err) => {
                    if (err) {
                        ok = false;
                        helper.error("Erreur de mise à jour du fichier 'package.json' !!");
                    }
                });
            } else{
                helper.warn("Suppression des dépendances fixées non prise en compte, forcer l'usage avec l'option -f");
            }
            if (ok) done();
            else {
                throw new Error("Erreur de mise à jour des fixed dependencies")
            }
        }
    }
}

module.exports = CleanFixedDependencies;