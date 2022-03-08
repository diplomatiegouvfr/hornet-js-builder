const path = require("path");
const gulpTypescript = require("gulp-typescript");
const PluginError = require("plugin-error");
const Task = require("../../task");

class CompileTypeScriptIndex extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.configTsFile = helper.getTsFile() || "tsconfig.json";
    }

    task(gulp, helper, conf, project) {
        return (doneFn) => {
            if (helper.isIDE()) {
                // Ide: rien à compiler c'est l'IDE qui gère les .js, les .dts et les .maps
                helper.debug("Pas besoin de compiler les TS ni les DTS");
                doneFn();
                return;
            }

            if (!conf.autoGenerateIndex) {
                helper.info("Fichier d'index typescript 'index.ts' non généré (configuration) !!");
                return doneFn();
            }

            if (!helper.fileExists(path.join(project.dir, this.configTsFile))) {
                return doneFn(new Error(`Le fichier '${this.configTsFile}' est introuvable dans le répertoire '${project.dir}'`));
            }

            const configTS = {
                typescript: require((conf.typescript && conf.typescript.bin) || "typescript"), // permet de forcer la version de typescript déclarée dans le builder plutôt que celle du plugin gulp-typescript
            };

            if (
                project.type === helper.TYPE.MODULE ||
                project.type === helper.TYPE.COMPOSANT ||
                (project.tsConfig.compilerOptions || {}).declaration === true
            ) {
                configTS.declaration = false;
            }

            const tsProject = gulpTypescript.createProject(path.join(project.dir, this.configTsFile), configTS);

            // Activation de la génération des sources maps
            let tsResult = gulp.src(["index.ts"]);

            // Activation de la compilation typeScript
            tsResult = tsResult.pipe(tsProject());

            // Gestion des erreurs
            const hasError = false;

            const jsPipe = tsResult.js
                // modifie les fichiers pour que le plugin sourcemaps génère correctement les fichiers de map
                .pipe(
                    gulp.dest((file) => {
                        return file.base;
                    }),
                );

            // Merge des deux pipes pour terminer quand les deux sont terminés
            helper.stream(() => {
                if (hasError && project.watch === true) {
                    helper.info("Au moins une erreur de compilation typeScript s'est produite");
                } else {
                    doneFn(hasError ? new PluginError("gulp-typescript", "Au moins une erreur de compilation typeScript s'est produite") : undefined);
                }
            }, jsPipe);
        };
    }
}

module.exports = CompileTypeScriptIndex;
