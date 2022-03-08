const path = require("path");
const chalk = require("chalk");
const sourcemaps = require("gulp-sourcemaps");
const gulpTypescript = require("gulp-typescript");
const PluginError = require("plugin-error");
const Helper = require("../../../helpers");
const Task = require("../task");
const Utils = require("../utils");

class CompileTypeScript extends Task {
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
            if (!helper.fileExists(path.join(project.dir, this.configTsFile))) {
                return doneFn(new Error(`Le fichier '${this.configTsFile}' est introuvable dans le répertoire '${project.dir}'`));
            }

            const configTS = {
                typescript: require((conf.typescript && conf.typescript.bin) || "typescript"), // permet de forcer la version de typescript déclarée dans le builder plutôt que celle du plugin gulp-typescript
            };

            if (project.type === helper.TYPE.MODULE || project.type === helper.TYPE.COMPOSANT) {
                configTS.declaration = true;
                configTS.sourceMap = true;
            }

            const tsProject = gulpTypescript.createProject(path.join(project.dir, this.configTsFile), configTS);

            // Activation de la génération des sources maps
            let tsResult = tsProject.src().pipe(sourcemaps.init());

            // Activation de la compilation typeScript
            tsResult = tsResult.pipe(tsProject(defaultReporter()));

            // Gestion des erreurs
            let hasError = false;
            tsResult.on("error", () => {
                hasError = true;
            });

            const jsPipe = tsResult.js
                // modifie les fichiers pour que le plugin sourcemaps génère correctement les fichiers de map
                // .pipe(Utils.rebase(project.dir + path.sep/*conf.target.ts*/))
                .pipe(
                    sourcemaps.mapSources(function (sourcePath, file) {
                        return conf.tscOutDir
                            ? path.relative(path.dirname(path.join(file._base, sourcePath)), path.join(project.dir, sourcePath))
                            : path.join(".", sourcePath);
                    }),
                )
                .pipe(
                    sourcemaps.write(".", {
                        includeContent: true,
                        sourceRoot: (file) => {
                            return new String(""); // file.base;
                        },
                        ...conf.prepare.compile.sourceMapsOption,
                    }),
                )
                // restaure le paramétrage des fichiers après la génration des fichiers de map
                .pipe(Utils.rebase(project.dir + path.sep /* conf.target.ts */))
                .pipe(
                    gulp.dest((file) => {
                        return file.base;
                    }),
                );

            let dtsPipe = tsResult;
            if (
                (project.type !== helper.TYPE.APPLICATION && project.type !== helper.TYPE.APPLICATION_SERVER) ||
                (project.tsConfig.compilerOptions || {}).declaration === true
            ) {
                // Pour les applications les fichiers de définitions ne sont pas utiles
                dtsPipe = tsResult.dts.pipe(Utils.absolutizeModuleRequire(helper, project)).pipe(
                    gulp.dest((file) => {
                        return file.base;
                    }),
                );
            }

            // Merge des deux pipes pour terminer quand les deux sont terminés
            const stream = [jsPipe];
            if (conf.tscOutDir) {
                // copie des autres ressources
                stream.push(
                    gulp
                        .src(conf.prepare.compile.othersFilesToCopy, { base: project.dir, cwd: project.dir })
                        .pipe(gulp.dest(path.join(project.dir, conf.tscOutDir))),
                );
            }

            stream.push(dtsPipe);

            helper.stream(() => {
                hasError && helper.error("Au moins une erreur de compilation typeScript s'est produite.");
                if (hasError && (project.type === helper.TYPE.MODULE || project.type === helper.TYPE.COMPOSANT) && !project.watch) {
                    process.exit(1);
                } else if (hasError) {
                    if (!helper.__nodemon && !project.watch) {
                        doneFn(new PluginError("gulp-typescript", "Au moins une erreur de compilation typeScript s'est produite."));
                        process.exit(1);
                    } else {
                        doneFn();
                    }
                } else {
                    doneFn();
                }
            }, ...stream);
        };
    }
}

module.exports = CompileTypeScript;

function defaultReporter() {
    return {
        error: (error) => {
            Helper.info(error.message);
        },
        finish: defaultFinishHandler,
    };
}

function defaultFinishHandler(results) {
    let hasError = false;
    const showErrorCount = (count, type) => {
        if (count === 0) return;

        Helper.info("TypeScript:", chalk.magenta(count.toString()), (type !== "" ? `${type} ` : "") + (count === 1 ? "error" : "errors"));
        hasError = true;
    };

    showErrorCount(results.transpileErrors, "");
    showErrorCount(results.optionsErrors, "options");
    showErrorCount(results.syntaxErrors, "syntax");
    showErrorCount(results.globalErrors, "global");
    showErrorCount(results.semanticErrors, "semantic");
    showErrorCount(results.declarationErrors, "declaration");
    showErrorCount(results.emitErrors, "emit");

    if (!results.noEmit) {
        if (results.emitSkipped) {
            Helper.info("TypeScript: emit", chalk.red("failed"));
        } else if (hasError) {
            Helper.info("TypeScript: emit", chalk.cyan("succeeded"), "(with errors)");
        }
    }
}
