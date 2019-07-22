"use strict";

const InstallDependencies = require("./install-dependencies");

class InstallNpmCiDependencies extends InstallDependencies {

    task(gulp, helper, conf, project) {
        return (done) => {
            this.runNpmCommand(project, helper, "ci", []).catch((err) => {
                helper.error("Erreur durant l'installation des dépendances en mode CI : " + err);
                done(err);
            }).then((resolve) => {
                done();
            });
        }
    }
}

module.exports = InstallNpmCiDependencies;