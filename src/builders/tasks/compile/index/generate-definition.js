"use strict";

const _ = require("lodash");
const PluginError = require("plugin-error");
const gulpTypescript = require("gulp-typescript");
const sourcemaps = require("gulp-sourcemaps");
const path = require("path");
const Utils = require("../../utils");

const Task = require("../../task");

class GenerateDefinition extends Task {

    task(gulp, helper, conf, project) {
        return (doneFn) => {

            if (!helper.fileExists(path.join(project.dir, "tsconfig.json"))) {
                return doneFn(new Error("Le fichier 'tsconfig.json' est introuvable dans le répertoire '" + project.dir + "'"));
            }

            if(!conf.autoGenerateIndex) {
                helper.info("Fichier d'index typescript 'index.ts' non généré (configuration) !!");
                return doneFn();
            }

            let configTS = {
                typescript: require((conf.typescript && conf.typescript.bin) || "typescript") // permet de forcer la version de typescript déclarée dans le builder plutôt que celle du plugin gulp-typescript
            }

            if (project.type === helper.TYPE.MODULE || project.type === helper.TYPE.COMPOSANT) {
                configTS.declaration = true;
            }

            var tsProject = gulpTypescript.createProject(path.join(project.dir, "tsconfig.json"), configTS);

            // Activation de la génération des sources maps
            var tsResult = tsProject.src()
                .pipe(sourcemaps.init());

            // Activation de la compilation typeScript
            tsResult = tsResult.pipe(tsProject());

            // Gestion des erreurs
            var hasError = false;
            tsResult.on("error", () => {
                hasError = true;
            });

            var jsPipe = tsResult.js
            // modifie les fichiers pour que le plugin sourcemaps génère correctement les fichiers de map
                .pipe(Utils.rebase(conf.target.ts))
                .pipe(sourcemaps.write(".", {
                    includeContent: false, sourceRoot: () => {
                        return "";
                    }
                })) //
                // restaure le paramétrage des fichiers après la génration des fichiers de map
                .pipe(Utils.rebase(conf.target.ts))
                .pipe(gulp.dest((file) => {
                    return file.base;
                }));

            var dtsPipe = tsResult;
            if (project.type !== helper.TYPE.APPLICATION && project.type !== helper.TYPE.APPLICATION_SERVER) {
                // Pour les applications les fichiers de définitions ne sont pas utiles
                dtsPipe = tsResult.dts.pipe(gulp.dest((file) => {
                    return file.base;
                }));
            }

            // Merge des deux pipes pour terminer quand les deux sont terminés
            helper.stream(
                () => {
                    if(hasError && project.watch === true) {
                        helper.info("Au moins une erreur de compilation typeScript s'est produite");
                        doneFn();
                    } else {
                        doneFn(hasError ? new PluginError("gulp-typescript", "Au moins une erreur de compilation typeScript s'est produite") : undefined);
                    }
                },
                dtsPipe,
                jsPipe
            );
        }
    }
}

module.exports = GenerateDefinition;
