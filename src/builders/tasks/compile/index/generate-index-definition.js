"use strict";
const Utils = require("../../utils");
const path = require("path");
const through = require("through2");
const concat = require("gulp-concat");
const PluginError = require("plugin-error");
const _ = require("lodash");

const Task = require("../../task");

class GenerateIndexDefinition extends Task {

    task(gulp, helper, conf, project) {
        return (done) => {
            let streams = [];
            if (!helper.fileExists(path.join(project.dir, "tsconfig.json"))) {
                return done(new Error("Le fichier 'tsconfig.json' est introuvable dans le répertoire '" + project.dir + "'"));
            }
            let tscOutDir = project.tsConfig.compilerOptions || {};
            tscOutDir = tscOutDir.outDir || undefined;
            var dest = tscOutDir ? path.resolve(project.dir, tscOutDir) : project.dir;
            var srcDTS = (tscOutDir ? ["**/*.d.ts"].map(helper.prepend(tscOutDir)) : conf.sourcesDTS).concat("!index.d/ts");
            
            if (!project.packageJson.types) {
                project.packageJson.types = "./index.d.ts"
                streams.push(gulp.src(["package.json"])
                            .pipe(Utils.packageJsonFormatter(helper, project))
                            .pipe(gulp.dest(".")));
            }

            streams.push(gulp.src(srcDTS, tscOutDir ? {base: tscOutDir} : {})
                    .pipe(modularizeDTS(helper, conf, project, tscOutDir, dest))
                    .pipe(concat("index.d.ts"))
                    .pipe(Utils.absolutizeModuleRequire(helper, project))
                    .pipe(gulp.dest(dest)));

            helper.debug("[buildTypeScriptDefinition] dest:", dest);

            helper.stream(
                function () {
                    Utils.gulpDelete(helper, conf.postTSClean)(done);
                },
                streams
            );
        }
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
    var regexRequire = /require\(["'](([\.\/]+|src|test\/)[\w\-\/]*)["']\)/;

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
            var absolutePath = file.path,
                dir = path.dirname(absolutePath),
                fileName = path.basename(absolutePath, ".d.ts"),
                substrFrom = conf.baseDir.length,
                substrTo = absolutePath.indexOf(".d.ts"),
                moduleName = path.join(project.name, absolutePath.substring(substrFrom, substrTo)),
                content = file.contents.toString().replace(/declare /g, "").replace(/\r\n/g, "\n"),
                lines = content.split("\n");
            let moduleContent = "declare module ";

                helper.debug("[modularizeDTS] absolutePath: ", absolutePath);
                helper.debug("[modularizeDTS] moduleName: ", moduleName);

            if (tscOutDir) {
                let tscOutPath = path.resolve("/" + project.name, tscOutDir).substring(1);
                helper.debug("[modularizeDTS] relative: ", tscOutPath);

                if (helper.startsWith(moduleName, tscOutPath)) {
                    moduleName = moduleName.replace(tscOutPath, project.name);
                }
            }


            moduleName = Utils.systemPathToRequireName(moduleName);

            // le fichier index fourni le module "de base"
            if (fileName === "index") {
                moduleName = moduleName.substr(0, moduleName.indexOf("/"));
            }

            helper.debug("[modularizeDTS] new moduleName: ", moduleName);

            // remplacement des require("<cheminRelatif>") par require("<moduleName>/src/ts/<cheminRelatif>")
            lines = _.map(lines, function (line) {
                var processedLine = line,
                    matches = regexRequire.exec(line);
                //helper.debug("line: ", line, "match:", matches);
                if (matches) {
                    var required = matches[1];
                    if (helper.startsWith(required, "src/")) {
                        if (helper.fileExists(path.join(project.dir, required + ".js"))
                            || helper.fileExists(path.join(project.dir, required + ".jsx"))) {
                            required = project.name + "/" + required;
                            // mise à jour du require()
                            helper.debug("[modularizeDTS] raw required:", required);
                            processedLine = line.replace(regexRequire, "require(\"" + required + "\")");
                        }
                    } else {
                        // récupération du fichier correspondant : "/.../hornet-js/projet_a/x/y/z/..."
                        required = path.resolve(dir, required);
                        helper.debug("[modularizeDTS] raw required:", required);
                        // extraction du chemin interne d'accès, relatif à la racine du projet courant :
                        // "/x/y/z/..."
                        var innerRequiredPath = required.substr(substrFrom);
                        // ajout du nom externe du projet (déclaré dans package.json)
                        required = path.join(project.name, innerRequiredPath);
                        // '\' -> '/' (Windows)
                        required = Utils.systemPathToRequireName(required);
                        // mise à jour du require()
                        processedLine = line.replace(regexRequire, "require(\"" + required + "\")");
                    }
                }
                return processedLine;
            });

            lines = _.map(lines, function (line) {
                return "\t" + line;
            });

            moduleContent += "\"" + moduleName + "\" {" + "\n";
            moduleContent += lines.join("\n");
            moduleContent += "\n" + "}" + "\n";
            file.contents = Buffer.from(moduleContent);
            this.push(file);
        } catch (err) {
            helper.error("erreur :", err);
            this.emit("error", new PluginError("modularizeDTS", err, {
                fileName: file.path
            }));
        }

        cb();
    });
}

/**
 * Nettoie le fichier defintion.d.ts global du module
 */
function postProcessDTS(helper) {
    var regexTypings = /path="(.+\/hornet-js-ts-typings\/)/,
        regexReferences = /([\/]{3}\s+<reference\s+path="[^"]*"\s*\/>)/;

    return through.obj(function (file, enc, cb) {
        helper.debug("[postProcessDTS] file.path: " + file.path);

        try {
            var content = file.contents.toString(),
                lines = content.split("\n");

            // extraction des "/// <reference path="..." />"
            var references = _.filter(lines, function (line) {
                return regexReferences.test(line);
            });
            lines = _.filter(lines, function (line) {
                return !regexReferences.test(line);
            });

            // (../)*hornet-js-ts-typings/aaa/ -> ../aaa
            references = _.map(references, function (reference) {
                return reference.replace(regexTypings, "path=\"../");
            });

            // dé-duplication des "/// <reference path="..." />"
            references = _.uniq(references);
            references = references.join(os.EOL);

            var newContent = lines.join(os.EOL);
            newContent = references + os.EOL + newContent;

            file.contents = Buffer.from(newContent);
            this.push(file);
        } catch (err) {
            this.emit("error", new PluginError("postProcessDTS", err, {
                fileName: file.path
            }));
        }

        cb();
    });
}



module.exports = GenerateIndexDefinition;
