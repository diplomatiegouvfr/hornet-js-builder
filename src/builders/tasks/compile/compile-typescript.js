"use strict";

const _ = require("lodash");
const PluginError = require("plugin-error");
const gulpTypescript = require("gulp-typescript");
const sourcemaps = require("gulp-sourcemaps");
const path = require("path");
const Utils = require("../utils");
const nodemon = require("nodemon");

const Task = require("./../task");

class CompileTypeScript extends Task {

    task(gulp, helper, conf, project) {
        var timeout = null;

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
                configTS.declaration = true;
                configTS.sourceMap = true;
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
                .pipe(Utils.rebase("." + path.sep/*conf.target.ts*/))
                .pipe(sourcemaps.write(".", {
                    includeContent: true
                }))
                // restaure le paramétrage des fichiers après la génration des fichiers de map
                .pipe(Utils.rebase("." + path.sep/*conf.target.ts*/))
                .pipe(gulp.dest((file) => {
                    return file.base;
                }));

            var dtsPipe = tsResult;
            if (project.type !== helper.TYPE.APPLICATION && project.type !== helper.TYPE.APPLICATION_SERVER) {
                // Pour les applications les fichiers de définitions ne sont pas utiles
                dtsPipe = tsResult.dts
                .pipe(Utils.absolutizeModuleRequire(helper, project))
                .pipe(gulp.dest((file) => {
                    return file.base;
                }));
            }

            // Merge des deux pipes pour terminer quand les deux sont terminés
            let stream = [jsPipe];
            if(conf.tscOutDir) {
                stream.push(gulp.src([ "./package.json", "./src/**/*", "./test/**/*",
                    "!./src/**/*.ts",
                    "!./src/**/*.tsx",
                    "!./test/**/*.ts",
                    "!./test/**/*.tsx"
                    
                ], {base: "."})
                .pipe(gulp.dest(conf.tscOutDir)));
            }
            
            stream.push(dtsPipe);

            helper.stream(
                () => {
                    if(hasError && (project.type === helper.TYPE.MODULE || project.type === helper.TYPE.COMPOSANT)) {
                        helper.info("Au moins une erreur de compilation typeScript s'est produite");
                        doneFn();
                    } else {
                        doneFn(hasError ? new PluginError("gulp-typescript", "Au moins une erreur de compilation typeScript s'est produite") : (() => {if (timeout) clearTimeout(timeout); timeout=setTimeout(function () {
                                timeout = null;
                                nodemon.restart();
                            }, 1000);
                            return undefined;
                        })())
                    }
                },
                ...stream
            );
        }
    }
}

module.exports = CompileTypeScript;