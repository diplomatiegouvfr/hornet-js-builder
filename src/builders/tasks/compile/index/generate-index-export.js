"use strict";

const path = require("path");
const fs = require("fs");
const Task = require("../../task");

class GenerateIndexExport extends Task {

    task(gulp, helper, conf, project) {
        return (doneFn) => {
            if (helper.fileExists(path.join(project.dir, "index.ts"))) {
                helper.debug("Fichier d'index typescript 'index.ts' déjà présent !!");
                return doneFn();
            }

            if (!conf.autoGenerateIndex) {
                helper.info("Fichier d'index typescript 'index.ts' non généré (configuration) !!");
                return doneFn();
            }

            let tscOutDir = project.tsConfig.compilerOptions || {};
            tscOutDir = tscOutDir.outDir || undefined;
            var dest = tscOutDir ? path.resolve(project.dir, tscOutDir) : project.dir;

            helper.stream(
                function () {
                    //Utils.gulpDelete(helper, conf.postTSClean)(doneFn);

                    let moduleDeclare = /declare +module *("[^"]+\/src[^"]+\")/i;
                    let moduleExports = [];
                    var lineReader = require('readline').createInterface({
                        input: require('fs').createReadStream(path.join(dest, "index.d.ts"))
                    });

                    lineReader.on("line", function (line) {
                        let result = moduleDeclare.exec(line);
                        if (result && result[1].substring(1, result[1].length - 1) !== project.name) {
                            moduleExports.push("export * from " + result[1].replace(project.name, ".") + ";")
                        }
                    });
                    lineReader.on("close", () => {
                        fs.writeFile(path.join(project.dir, "index.ts"), moduleExports.join("\n"), (err) => {
                            if (err) {
                                ok = false;
                                helper.error("Erreur de mise à jour du fichier 'package.json' !!");
                            }
                        });
                        doneFn();
                    });
                },
                gulp.src(path.join(dest, "index.d.ts"), { base: dest })
            );
        }
    }
}

module.exports = GenerateIndexExport;
