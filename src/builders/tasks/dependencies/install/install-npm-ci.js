const path = require("path");
const InstallDependencies = require("./install-dependencies");

class InstallNpmCiDependencies extends InstallDependencies {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, installInBuildDirectory) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
        this.installInBuildDirectory = installInBuildDirectory;
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            const installIn = this.installInBuildDirectory ? path.join(project.dir, conf.buildWorkDir, project.name) : project.dir;

            InstallDependencies.installDependencyCmd(project, helper, ["ci", "--only=prod"], [], installIn)
                .catch((err) => {
                    helper.error(`Erreur durant l'installation des dépendances en mode CI : ${err}`);
                    done(err);
                })
                .then((resolve) => {
                    done();
                });
        };
    }
}

module.exports = InstallNpmCiDependencies;
