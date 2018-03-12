"use strict";

const _ = require("lodash");
const gutil = require("gulp-util");
const gulpTypescript = require("gulp-typescript");
const sourcemaps = require("gulp-sourcemaps");
const path = require("path");
const through = require("through2");
const Utils = require("../../utils");

const Task = require("../../task");

class CompileTypeScriptIndex extends Task {

    task(gulp, helper, conf, project) {
        return (doneFn) => {
            if (helper.isIDE()) {
                // Ide: rien à compiler c'est l'IDE qui gère les .js, les .dts et les .maps
                helper.debug("Pas besoin de compiler les TS ni les DTS");
                doneFn();
                return;
            }
            if (!helper.fileExists(path.join(project.dir, "tsconfig.json"))) {
                return doneFn(new Error("Le fichier 'tsconfig.json' est introuvable dans le répertoire '" + project.dir + "'"));
            }

            let configTS = {
                typescript: require((conf.typescript && conf.typescript.bin) || "typescript") // permet de forcer la version de typescript déclarée dans le builder plutôt que celle du plugin gulp-typescript
            }

            if (project.type === helper.TYPE.MODULE || project.type === helper.TYPE.COMPOSANT) {
                configTS.declaration = false;
            }

            var tsProject = gulpTypescript.createProject(path.join(project.dir, "tsconfig.json"), configTS);

            // Activation de la génération des sources maps
            var tsResult = gulp.src(["index.ts"])

            // Activation de la compilation typeScript
            tsResult = tsResult.pipe(tsProject(gulpTypescript.reporter.nullReporter()));

            // Gestion des erreurs
            var hasError = false;

            var jsPipe = tsResult.js
            // modifie les fichiers pour que le plugin sourcemaps génère correctement les fichiers de map
                .pipe(gulp.dest((file) => {
                    return file.base;
                }));


            // Merge des deux pipes pour terminer quand les deux sont terminés
            helper.stream(
                () => {
                    doneFn(hasError ? new gutil.PluginError("gulp-typescript", "Au moins une erreur de compilation typeScript s'est produite") : undefined);
                },
                jsPipe
            );
        }
    }
}

module.exports = CompileTypeScriptIndex;
