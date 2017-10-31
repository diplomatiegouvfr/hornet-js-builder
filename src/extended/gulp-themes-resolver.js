var fs = require("fs");
var del = require("del");

function createDirectoryIfMissing(helper, directory) {
    if (!helper.folderExists(directory)) {
        helper.info("Création du répertoire "+directory);
        fs.mkdirSync(directory);
    }
}

function deleteDirectoryIfExists(helper, directory) {
    if (helper.folderExists(directory)) {
        helper.info("Nettoyage du répertoire "+directory);
        del.sync(directory);
    }
}

module.exports = {
    compileTaskForEmbeddedThemesApps: function (helper, gulp, conf, done) {
        
        var project = helper.getCurrentProject();

        if (helper.fileExists(project.configJsonPath)) {
            // execution de la tache qui genere les themes si le projet hornet-themes est présent dans les external module
            var defaultJson = JSON.parse(fs.readFileSync(project.configJsonPath));
            var themeEmbedded = defaultJson["themeEmbedded"];
            if (themeEmbedded) {
                helper.info("Application avec thêmes embarqués : " + conf.themeDir);
                const staticHornetThemeDirectory = "static/" + themeEmbedded;
                deleteDirectoryIfExists(helper, staticHornetThemeDirectory);

                helper.info("hornet-themes dependency - Deployment to Static application");
                createDirectoryIfMissing(helper, staticHornetThemeDirectory);
                var packageJson = JSON.parse(fs.readFileSync(project.packageJsonPath));
                var themeVersion = packageJson["appDependencies"][themeEmbedded];
                var directoryToMove = conf.themeDir + "/target/package/" + themeVersion;
                var directoryExtension = "/**/*.*";
                var destinationDirectory = staticHornetThemeDirectory;
                helper.info("Déplacement de hornet-themes dans la partie static");
                if (helper.folderExists(directoryToMove)) {
                    gulp.src(directoryToMove + directoryExtension)
                        .pipe(gulp.dest(destinationDirectory))
                        .on( 'finish', () => {
                            done();
                        });
                } else {
                    helper.error("Le répertoire "+ directoryToMove+ " n'existe pas ");
                    done();
                }
            } else {
                done();
            }
        } else {
            done();
        }
    }
};