"use strict";

const _ = require("lodash");
const gutil = require("gulp-util");
const gulpTypescript = require("gulp-typescript");
const sourcemaps = require("gulp-sourcemaps");
const path = require("path");
const through = require("through2");
const Utils = require("../../utils");

const Task = require("../../task");

class GenerateDefinition extends Task {

    task(gulp, helper, conf, project) {
        return (doneFn) => {

            if (!helper.fileExists(path.join(project.dir, "tsconfig.json"))) {
                return doneFn(new Error("Le fichier 'tsconfig.json' est introuvable dans le répertoire '" + project.dir + "'"));
            }

            let configTS = {
                typescript: require((conf.typescript && conf.typescript.bin) || "typescript") // permet de forcer la version de typescript déclarée dans le builder plutôt que celle du plugin gulp-typescript
            }

            if (project.type === helper.TYPE.MODULE || project.type === helper.TYPE.COMPOSANT) {
                configTS.declaration = true;
            }

            var tsProject = gulpTypescript.createProject(path.join(project.dir, "tsconfig.json"), configTS);

            // Activation de la génération des sources maps
            var tsResult = tsProject.src()//gulp.src(["**/*.ts", "**/*.tsx", "!./index.d.ts", "!node_modules/**/*", "definition-ts/**/*.d.ts"])
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
                .pipe(Utils.rebase(conf.targetTS))
                .pipe(sourcemaps.write(".", {
                    includeContent: false, sourceRoot: () => {
                        return "";
                    }
                })) //
                // restaure le paramétrage des fichiers après la génration des fichiers de map
                .pipe(Utils.rebase(conf.targetTS))
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
                    doneFn(hasError ? new gutil.PluginError("gulp-typescript", "Au moins une erreur de compilation typeScript s'est produite") : undefined);
                },
                dtsPipe,
                jsPipe
            );
        }
    }
}


/**
 * Altère la description des fichiers pour la bonne génération des sourcemaps
 * @param defaultBase file.base à appliquer sur les fichier de map
 * @return {*}
 */
function rebase(defaultMapBase) {
    return through.obj((file, enc, cb) => {
        if (file.isNull()) {
            cb(null, file);
            return;
        }

        if (file.isStream()) {
            cb(new gutil.PluginError("hornetbuilder-rebase", "Streaming not supported"));
            return;
        }

        try {
            // nouvelles valeurs de 'file.base' et 'file.relative' à appliquer
            var newbase = file.oldBase || path.join(file.base, path.dirname(file.relative));
            //var newrelative = file.oldRelative || path.basename(file.relative);

            var isMap = _.endsWith(file.relative, ".js.map");
            var firstPass = !(file.oldBase); // premier passage
            if (isMap) {
                newbase = defaultMapBase;
            } else if (firstPass && file.sourceMap && file.sourceMap.sources) {
                // ne conserve dans l'attribut 'file.sourceMap.sources' que les noms des fichier,
                // à la place du chemin relatif
                var newSources = file.sourceMap.sources.map((sourceMapFile) => {
                    return sourceMapFile.split("/").pop(); // extraction du nom de fichier
                });
                file.sourceMap.sources = newSources;
            }

            // permet de se rappeler des valeurs actuelles pour le prochain passage
            file.oldBase = file.base;
            file.oldRelative = file.relative;

            file.base = newbase;
            //file.relative = newrelative;
            this.push(file);
        } catch (err) {
            this.emit("error", new gutil.PluginError("hornetbuilder-rebase", err, {
                fileName: file.path
            }));
        }

        cb();
    });
}


module.exports = GenerateDefinition;
