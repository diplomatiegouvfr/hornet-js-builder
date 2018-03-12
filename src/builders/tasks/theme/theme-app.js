"use strict";

const fs = require("fs");
const del = require("del");
const path = require("path");
const Task = require("../task");
const State = require("../../state");

class ThemeInclusion extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
    }

    task(gulp, helper, conf) {
        return (done) => {

            //if (!state.appDependenciesChanged) { return done(); }
                    
            var project = helper.getCurrentProject();

            if (helper.fileExists(project.configJsonPath)) {
                // execution de la tache qui genere les themes si le projet hornet-themes est présent dans les external module
                var defaultJson = JSON.parse(fs.readFileSync(project.configJsonPath));
                var themeName = defaultJson["themeName"];
                if (themeName) {
                    helper.debug("Application avec thèmes embarqués : " + themeName);
                    const staticHornetThemeDirectory = "static/" + themeName;
                    deleteDirectoryIfExists(helper, staticHornetThemeDirectory);

                    helper.debug("hornet-themes dependency - Deployment to Static application");
                    createDirectoryIfMissing(helper, staticHornetThemeDirectory);
                    var packageJson = JSON.parse(fs.readFileSync(project.packageJsonPath));
                    var themeVersion = packageJson["appDependencies"][themeName];
                    let directoryToMove = "";
                    if (State.externalDependencies[project.name][themeName] && State.externalDependencies[project.name][themeName].version == themeVersion) {
                        directoryToMove = State.externalDependencies[project.name][themeName].dir + "/target/package";
                    } else {
                        directoryToMove = path.join(project.dir, helper.NODE_MODULES_APP, themeName)
                    }
                    var directoryExtension = "/**/*.*";
                    var destinationDirectory = staticHornetThemeDirectory;
                    helper.debug("Déplacement de hornet-themes dans la partie static");
                    if (helper.folderExists(directoryToMove)) {
                        gulp.src(directoryToMove + directoryExtension)
                            .pipe(gulp.dest(destinationDirectory))
                            .on( "finish", () => {
                                done();
                            });
                    } else {
                        helper.error("Le répertoire "+ directoryToMove+ " n'existe pas ");
                        process.exit(1);
                    }
                } else {
                    done();
                }
            } else {
                done();
            }
        }
    }
}

function createDirectoryIfMissing(helper, directory) {
    if (!helper.folderExists(directory)) {
        helper.debug("Création du répertoire "+directory);
        fs.mkdirSync(directory);
    }
}

function deleteDirectoryIfExists(helper, directory) {
    if (helper.folderExists(directory)) {
        helper.debug("Nettoyage du répertoire " + directory);
        helper.removeDir(directory);
    }
}

module.exports = ThemeInclusion;
