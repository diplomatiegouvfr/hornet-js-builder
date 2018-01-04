"use strict";

const fs = require("fs");
const path = require("path");
const Task = require("../task");
const State = require("../../state");

class CommunityThemeInclusion extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
    }

    task(gulp, helper, conf) {
        return (done) => {

            let project = helper.getCurrentProject();
            let packageJson = JSON.parse(fs.readFileSync(project.packageJsonPath));

            const communityProjects = [];
            Object.keys(packageJson["appDependencies"]).forEach((module) => {
                // Recherche des projets liés à "hornet-js-community"
                if (module.indexOf("hornet-js-community") !== -1 && module != "hornet-js-community") {
                    let dir = null;

                    // Gestion des externalModules
                    if (State.externalDependencies[project.name][module]) {
                        dir = State.externalDependencies[project.name][module].dir;
                    } else {
                        dir = path.join(project.dir, helper.NODE_MODULES_APP, module);
                    }

                    // Si c'est un project de type "composant"...
                    let communityProject = helper.getProject(dir);
                    if(communityProject.type && communityProject.type == helper.TYPE.COMPOSANT) {
                        communityProjects.push({
                            name: module,
                            dir: dir,
                            version: packageJson["appDependencies"][module]
                        });
                    }
                }
            });

            if (communityProjects.length > 0) {
                helper.info("Application avec thèmes embarqués : hornet-js-community");
                const staticCommunityThemeDirectory = "static/hornet-js-community";
                deleteDirectoryIfExists(helper, staticCommunityThemeDirectory);
                helper.info("hornet-themes dependency - Deployment to Static application");
                createDirectoryIfMissing(helper, staticCommunityThemeDirectory);


                let myPromise = new Promise((resolve, reject) => {
                    resolve();
                });

                myPromise.then((resolve, reject) => {
                    communityProjects.forEach((communityProject) => {
                        copyThemes(communityProject, staticCommunityThemeDirectory);
                    })

                }).then((resolve, reject) => {
                    done();
                });

            } else {
                done();
            }

        };


        function copyThemes(communityProject, staticCommunityThemeDirectory) {
            let themeVersion = communityProject.version;
            let directoryToMove = path.join(communityProject.dir, "static");
            if (themeVersion) {

                let directoryExtension = "/**/*.*";
                let destinationDirectory = staticCommunityThemeDirectory;
                helper.info("Déplacement des " + communityProject.name + " dans la partie static");
                if (helper.folderExists(directoryToMove)) {
                    gulp.src(directoryToMove + directoryExtension)
                        .pipe(gulp.dest(destinationDirectory))
                } else {
                    helper.error("Le répertoire " + directoryToMove + " n'existe pas ");
                }

            } else {
                helper.error("La dépendance " + communityProject + " n'existe pas en version ", themeVersion);
            }
        }
    }
}

function createDirectoryIfMissing(helper, directory) {
    if (!helper.folderExists(directory)) {
        helper.info("Création du répertoire " + directory);
        fs.mkdirSync(directory);
    }
}

function deleteDirectoryIfExists(helper, directory) {
    if (helper.folderExists(directory)) {
        helper.info("Nettoyage du répertoire " + directory);
        helper.removeDir(directory);
    }
}

module.exports = CommunityThemeInclusion;
