const path = require("path");
const sourcemaps = require("gulp-sourcemaps");
const gulpTypescript = require("gulp-typescript");
const PluginError = require("plugin-error");
const Task = require("../../task");
const Utils = require("../../utils");

class GenerateDefinition extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.configTsFile = helper.getTsFile() || "tsconfig.json";
    }

    task(gulp, helper, conf, project) {
        return (doneFn) => {
            if (!helper.fileExists(path.join(project.dir, this.configTsFile))) {
                return doneFn(new Error(`Le fichier '${this.configTsFile}' est introuvable dans le répertoire '${project.dir}'`));
            }

            if (!conf.autoGenerateIndex) {
                helper.info("Fichier d'index typescript 'index.ts' non généré (configuration) !!");
                return doneFn();
            }

            const configTS = {
                typescript: require((conf.typescript && conf.typescript.bin) || "typescript"), // permet de forcer la version de typescript déclarée dans le builder plutôt que celle du plugin gulp-typescript
            };

            configTS.declaration = true;

            const tsProject = gulpTypescript.createProject(path.join(project.dir, this.configTsFile), configTS);

            // Activation de la génération des sources maps
            let tsResult = tsProject.src().pipe(sourcemaps.init());

            // Activation de la compilation typeScript
            tsResult = tsResult.pipe(tsProject());

            // Gestion des erreurs
            let hasError = false;
            tsResult.on("error", () => {
                hasError = true;
            });

            const jsPipe = tsResult.js
                // modifie les fichiers pour que le plugin sourcemaps génère correctement les fichiers de map
                .pipe(Utils.rebase(conf.target.ts))
                .pipe(
                    sourcemaps.write(".", {
                        includeContent: false,
                        sourceRoot: () => {
                            return "";
                        },
                    }),
                ) //
                // restaure le paramétrage des fichiers après la génration des fichiers de map
                .pipe(Utils.rebase(conf.target.ts))
                .pipe(
                    gulp.dest((file) => {
                        return file.base;
                    }),
                );

            const dtsPipe = tsResult.dts.pipe(
                gulp.dest((file) => {
                    return file.base;
                }),
            );

            // Merge des deux pipes pour terminer quand les deux sont terminés
            helper.stream(
                () => {
                    if (hasError && project.watch === true) {
                        helper.info("Au moins une erreur de compilation typeScript s'est produite");
                        doneFn();
                    } else {
                        doneFn(hasError ? new PluginError("gulp-typescript", "Au moins une erreur de compilation typeScript s'est produite") : undefined);
                    }
                },
                dtsPipe,
                jsPipe,
            );
        };
    }
}

module.exports = GenerateDefinition;
