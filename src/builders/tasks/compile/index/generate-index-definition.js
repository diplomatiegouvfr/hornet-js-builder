const path = require("path");
const concat = require("gulp-concat");
const filter = require("lodash.filter");
const uniq = require("lodash.uniq");
const PluginError = require("plugin-error");
const through = require("through2");
const Task = require("../../task");
const Utils = require("../../utils");

class GenerateIndexDefinition extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.configTsFile = helper.getTsFile() || "tsconfig.json";
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            const streams = [];
            if (!helper.fileExists(path.join(project.dir, this.configTsFile))) {
                return done(new Error(`Le fichier '${this.configTsFile}' est introuvable dans le répertoire '${project.dir}'`));
            }

            if (!project.packageJson.types) {
                project.packageJson.types = "./index.d.ts";
                streams.push(
                    gulp.src(["package.json"], { base: project.dir, cwd: project.dir }).pipe(Utils.packageJsonFormatter(helper, project)).pipe(gulp.dest("."))
                );
            }

            let tscOutDir = project.tsConfig.compilerOptions || {};
            tscOutDir = tscOutDir.outDir || undefined;
            const dest = tscOutDir ? path.resolve(project.dir, tscOutDir) : project.dir;
            const srcDTS = (tscOutDir ? ["**/*.d.ts"].map(helper.prepend(path.join(tscOutDir, conf.src))) : conf.sourcesDTS).concat(
                `!${project.packageJson.types}`,
            );

            streams.push(
                gulp
                    .src(srcDTS, tscOutDir ? { base: tscOutDir, cwd: project.dir } : { base: project.dir, cwd: project.dir })
                    .pipe(modularizeDTS(helper, conf, project, tscOutDir, dest))
                    .pipe(concat(project.packageJson.types.split(/[\\/]/g).pop()))
                    .pipe(Utils.absolutizeModuleRequire(helper, project))
                    .pipe(gulp.dest(dest)),
            );

            helper.debug("[buildTypeScriptDefinition] dest:", dest);

            helper.stream(function () {
                Utils.gulpDelete(helper, conf.postTSClean, project.dir)(done);
            }, streams);
        };
    }
}

/**
 * Concatène les fichiers de définition TS. Chaque définition issue d'un fichier est encapsulée dans un module :
 * <pre>
 * declare module "..." {
 *     // contenu du fichier de défintion TS
 * }
 * </pre>
 */
function modularizeDTS(helper, conf, project, tscOutDir, dest) {
    // require("./aaa")
    // require("../aaa")
    // require("../../aaa")
    // require("../../aaa/bbb")
    // require("src/aaa/bbb")
    const regexRequire = /require\(["'](([\.\/]+|src|test\/)[\w\-\/]*)["']\)/;
    const regexImport = /import[\s]*.*[\s]*from[\s]*["'](([\.\/]+|src\/)[\.\w\-\/]*)["']/;
    const regexExport = /export[\s]*.*[\s]*from[\s]*["'](([\.\/]+|src\/)[\.\w\-\/]*)["']/;
    const regexImportOnly = /import[\s]+["']([\.\/\w\-\/]*)["']/;

    return through.obj(function (file, enc, cb) {
        if (file.isNull()) {
            cb(null, file);
            return;
        }

        if (file.isStream()) {
            cb(new PluginError("modularizeDTS", "Streaming not supported"));
            return;
        }

        try {
            /*
             * Détermine le nom du module (ambient) TS à partir du chemin du fichier :
             * C:/.../hornet/hornet-js/projet/src/.../fichierModule.d.ts
             * ->
             * projectName/src/.../fichierModule
             */
            const absolutePath = file.path;
            const dir = path.dirname(absolutePath);
            const fileName = path.basename(absolutePath, ".d.ts");
            const substrFrom = conf.baseDir.length;
            const substrTo = absolutePath.indexOf(".d.ts");
            let moduleName = path.join(project.packageJson.name, absolutePath.substring(substrFrom, substrTo));
            const content = file.contents
                .toString()
                .replace(/declare /g, "")
                .replace(/\r\n/g, "\n");
            let lines = content.split("\n");
            const tscOutPath = tscOutDir ? path.resolve(project.dir, tscOutDir) : "";
            const tscOutPathModule = tscOutDir ? path.resolve(path.sep + project.packageJson.name, tscOutDir).substring(1) : "";
            const entryFilePath = path.resolve(tscOutPath, project.packageJson.main || "");
            let moduleContent = "declare module ";

            helper.debug("[modularizeDTS] absolutePath: ", absolutePath);
            helper.debug("[modularizeDTS] moduleName: ", moduleName);

            if (tscOutDir) {
                helper.debug("[modularizeDTS] relative: ", tscOutPath);

                if (helper.startsWith(moduleName, tscOutPath)) {
                    moduleName = moduleName.replace(tscOutPath, project.packageJson.name);
                } else {
                    const tscOutPathRelative = path.resolve(`/${project.packageJson.name}`, tscOutDir).substring(1);
                    helper.debug("[modularizeDTS] new relative: ", tscOutPathRelative);
                    if (helper.startsWith(moduleName, tscOutPathRelative)) {
                        moduleName = moduleName.replace(tscOutPathRelative, project.packageJson.name);
                    }
                }
            } else {
                moduleName = moduleName.replace(project.dir, project.packageJson.name);
            }

            moduleName = Utils.systemPathToRequireName(moduleName);
            // le fichier index fourni le module "de base"
            if (fileName === "index" && absolutePath === entryFilePath.replace(/\.js$/, ".d.ts")) {
                moduleName = project.packageJson.name;
            }

            helper.debug("[modularizeDTS] new moduleName: ", moduleName);

            // remplacement des require("<cheminRelatif>") par require("<moduleName>/src/ts/<cheminRelatif>")
            lines = lines.map(function (line) {
                let processedLine = line;
                let matches;
                if (regexRequire.test(line)) {
                    matches = regexRequire.exec(line);
                } else if (regexExport.test(line)) {
                    matches = regexExport.exec(line);
                } else {
                    matches = regexImport.exec(line);
                }
                // helper.debug("line: ", line, "match:", matches);
                if (matches) {
                    helper.debug("[modularizeDTS] raw import:", line);
                    let required = matches[1];
                    const oldRequired = matches[1];
                    if (helper.startsWith(required, "src/")) {
                        if (helper.fileExists(path.join(project.dir, `${required}.js`)) || helper.fileExists(path.join(project.dir, `${required}.jsx`))) {
                            required = `${project.name}/${required}`;
                            // mise à jour du require()
                            helper.debug("[modularizeDTS] raw required src:", required);
                            processedLine = line.replace(regexRequire, `require("${required}")`);
                        }
                    } else {
                        // récupération du fichier correspondant : "/.../hornet-js/projet_a/x/y/z/..."
                        required = path.resolve(dir, required);
                        helper.debug("[modularizeDTS] raw required:", required);
                        if (required !== entryFilePath.replace(/\.js$/, "")) {
                            // extraction du chemin interne d'accès, relatif à la racine du projet courant :
                            // "/x/y/z/..."
                            const innerRequiredPath = required.substr(substrFrom);
                            // ajout du nom externe du projet (déclaré dans package.json)
                            required = path.join(project.name, innerRequiredPath);
                            // '\' -> '/' (Windows)
                            required = Utils.systemPathToRequireName(required);
                            helper.debug("[modularizeDTS] raw required, tscOutPath, tscOutPathModule :", required, tscOutPath, tscOutPathModule);
                            if (helper.startsWith(required, tscOutPath)) {
                                required = required.replace(tscOutPath, project.packageJson.name);
                            } else if (helper.startsWith(required, tscOutPathModule)) {
                                required = required.replace(tscOutPathModule, project.packageJson.name);
                            }
                        } else {
                            required = project.packageJson.name;
                        }
                        // mise à jour du require()
                        processedLine = line.replace(oldRequired, required);
                    }

                    helper.debug("[modularizeDTS] raw new import:", processedLine);
                }
                if (regexImportOnly.test(processedLine)) {
                    processedLine = "";
                }
                return processedLine;
            });

            lines = lines.map(function (line) {
                return `\t${line}`;
            });

            moduleContent += `"${moduleName}" {` + `\n`;
            moduleContent += lines.join("\n");
            moduleContent += "\n" + "}" + "\n";
            file.contents = Buffer.from(moduleContent);
            this.push(file);
        } catch (err) {
            helper.error("erreur :", err);
            this.emit(
                "error",
                new PluginError("modularizeDTS", err, {
                    fileName: file.path,
                }),
            );
        }

        cb();
    });
}

/**
 * Nettoie le fichier defintion.d.ts global du module
 */
function postProcessDTS(helper) {
    const regexTypings = /path="(.+\/hornet-js-ts-typings\/)/;
    const regexReferences = /([\/]{3}\s+<reference\s+path="[^"]*"\s*\/>)/;

    return through.obj(function (file, enc, cb) {
        helper.debug(`[postProcessDTS] file.path: ${file.path}`);

        try {
            const content = file.contents.toString();
            let lines = content.split("\n");

            // extraction des "/// <reference path="..." />"
            let references = filter(lines, function (line) {
                return regexReferences.test(line);
            });
            lines = filter(lines, function (line) {
                return !regexReferences.test(line);
            });

            // (../)*hornet-js-ts-typings/aaa/ -> ../aaa
            references = references.map(function (reference) {
                return reference.replace(regexTypings, 'path="../');
            });

            // dé-duplication des "/// <reference path="..." />"
            references = uniq(references);
            references = references.join(os.EOL);

            let newContent = lines.join(os.EOL);
            newContent = references + os.EOL + newContent;

            file.contents = Buffer.from(newContent);
            this.push(file);
        } catch (err) {
            this.emit(
                "error",
                new PluginError("postProcessDTS", err, {
                    fileName: file.path,
                }),
            );
        }

        cb();
    });
}

module.exports = GenerateIndexDefinition;
