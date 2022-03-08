const os = require("os");
const path = require("path");
const del = require("del");
const endsWith = require("lodash.endswith");
const map = require("lodash.map");
const merge = require("lodash.merge");
const PluginError = require("plugin-error");
const through = require("through2");

const Utils = function () {};

Utils.gulpDelete = (helper, patterns, cwd = process.cwd) => {
    return (done) => {
        let formattedPatterns = Array.isArray(patterns) ? patterns : [patterns];
        formattedPatterns = formattedPatterns.map((pattern) => pattern.replace(/\\/g, "/")); // glob même sur windows
        del(formattedPatterns, { cwd }).then(
            (paths) => {
                helper.debug("Deleted files and folders:\n", paths.join("\n"));
                return done();
            },
            (err) => {
                // Rejet de la promesse
                return done(err);
            },
        );
    };
};
/**
 * Fonction retournant une fonction de mapping ajoutant les arguments après ceux du tableau sur lequel s'applique le mapping
 * @param ...args les arguments à ajouter
 * @returns {Function}
 */
Utils.append = () => {
    const args = Array.prototype.slice.call(arguments, 0);
    return (element) => {
        if (args.length === 1) {
            if (args[0] === "!") {
                return element + args[0];
            }
            return path.join(element, args[0]);
        }
        return args.map((argElement) => {
            return path.join(element, argElement);
        });
    };
};

/**
 * Fonction retournant une fonction de mapping ajoutant les arguments avant ceux du tableau sur lequel s'applique le mapping
 * @param ...args les arguments à ajouter
 * @returns {Function}
 */
Utils.prepend = () => {
    const args = Array.prototype.slice.call(arguments, 0);
    return (element) => {
        if (args.length === 1) {
            if (args[0] === "!") {
                return args[0] + element;
            }
            return path.join(args[0], element);
        }
        return args.map((argElement) => {
            return path.join(argElement, element);
        });
    };
};

/**
 * Renvoi la valeur d'une propriété d'un object donc on passe la description sous la forme x.y.z
 *
 * @param obj L'objet avec un ensemble de propriété
 * @param desc La propriété sous la forme x.y.z
 * @returns {*}
 */
Utils.getDescendantProp = (obj, desc) => {
    const arr = desc.split(".");
    while (arr.length && (obj = obj[arr.shift()]));
    return obj;
};

Utils.absolutizeModuleRequire = (helper, project, extensions, onlyExtensions) => {
    // require('src/aaa/bbb') > require('hornet-js-core/src/aaa/bbb')
    const regexRequire = /require\(["'](src\/[\w\-\/\.]*)["']\)/;
    const regexImportExportFrom = /(import|export)[\s]*(.*)[\s]*from[\s]*["'](src\/[\w\-\/]*)["']/;
    const extensionAbsolutize = extensions || [".js", ".tsx", ".ts", ".json"];

    let tscOutDir = project.tsConfig.compilerOptions || {};
    tscOutDir = tscOutDir.outDir || undefined;
    const dest = tscOutDir ? path.resolve(project.dir, tscOutDir) : project.dir;

    const testFileExistWithExtensions = function (fileName, lExt) {
        if (path.extname(fileName).length > 0) {
            return helper.fileExists(fileName);
        }
        for (let i = 0; i < lExt.length; i++) {
            if (helper.fileExists(fileName + lExt[i])) {
                return true;
            }
        }
        return false;
    };

    return through.obj(function (file, enc, cb) {
        if (file.isNull()) {
            cb(null, file);
            return;
        }

        if (file.isStream()) {
            cb(new PluginError("absolutizeModuleRequire", "Streaming not supported"));
            return;
        }

        try {
            if (!onlyExtensions || onlyExtensions.indexOf(file.extname) > -1) {
                const content = file.contents
                    .toString() /* .replace(/declare /g, '') */
                    .replace(/\r\n/g, "\n");
                let lines = content.split("\n");
                // helper.log("file to absolutizeModuleRequire ",file);
                // remplacement des require("src/...") par require("<moduleName>/src/...") OU
                // remplacement des import ... from "src/..." par import ... from "<moduleName>/src/..." OU
                // remplacement des export from "src/..." par export from "<moduleName>/src/..." OU
                lines = map(lines, function (line) {
                    let processedLine = line;
                    const matches = regexRequire.exec(line);
                    const matches2 = regexImportExportFrom.exec(line);

                    if (matches) {
                        var required = matches[1];
                        if (testFileExistWithExtensions(path.join(dest, required), extensionAbsolutize)) {
                            required = `${project.name}/${required}`;
                            processedLine = line.replace(regexRequire, `require("${required}")`);
                        }
                    } else if (matches2) {
                        const requiredType = matches2[1];
                        var required = matches2[2];
                        let requiredSrc = matches2[3];
                        if (testFileExistWithExtensions(path.join(dest, requiredSrc), extensionAbsolutize)) {
                            requiredSrc = `${project.name}/${requiredSrc}`;
                            processedLine = line.replace(regexImportExportFrom, `${requiredType} ${required} from "${requiredSrc}"`);
                        }
                    }
                    return processedLine;
                });

                file.contents = Buffer.from(lines.join("\n"));
            }
            this.push(file);
        } catch (err) {
            this.emit(
                "error",
                new PluginError("absolutizeModuleRequire", err, {
                    fileName: file.path,
                }),
            );
        }

        cb();
    });
};

Utils.systemPathToRequireName = (systemPath) => {
    return systemPath.replace(/\\/g, "/");
};

/**
 * Altère la description des fichiers pour la bonne génération des sourcemaps
 * @param defaultBase file.base à appliquer sur les fichier de map
 * @return {*}
 */
Utils.rebase = (defaultMapBase) => {
    return through.obj(function (file, enc, cb) {
        if (file.isNull()) {
            cb(null, file);
            return;
        }

        if (file.isStream()) {
            cb(new PluginError("hornetbuilder-rebase", "Streaming not supported"));
            return;
        }

        try {
            // nouvelles valeurs de 'file.base' et 'file.relative' à appliquer
            let newbase = file.oldBase || path.join(file.base, path.dirname(file.relative));
            // var newrelative = file.oldRelative || path.basename(file.relative);

            const isMap = endsWith(file.relative, ".js.map");
            const firstPass = !file.oldBase; // premier passage
            if (isMap) {
                newbase = defaultMapBase;
            } else if (firstPass && file.sourceMap && file.sourceMap.sources) {
                // ne conserve dans l'attribut 'file.sourceMap.sources' que les noms des fichier,
                // à la place du chemin relatif
                const newSources = file.sourceMap.sources.map(function (sourceMapFile) {
                    return sourceMapFile.split("/").pop(); // extraction du nom de fichier
                });
                file.sourceMap.sources = newSources;
            }

            // permet de se rappeler des valeurs actuelles pour le prochain passage
            file.oldBase = file.base;
            file.oldRelative = file.relative;

            file.base = newbase;
            // file.relative = newrelative;
            this.push(file);
        } catch (err) {
            this.emit(
                "error",
                new PluginError("hornetbuilder-rebase", err, {
                    fileName: file.path,
                }),
            );
        }

        cb();
    });
};

Utils.packageJsonFormatter = (helper, project) => {
    return through.obj(function (file, enc, cb) {
        if (file.isNull()) {
            cb(null, file);
            return;
        }

        if (file.isStream()) {
            cb(new PluginError("packageJsonFormatter", "Streaming not supported"));
            return;
        }

        try {
            const packageJsonCopy = merge({}, project.packageJson);
            const lines = JSON.stringify(packageJsonCopy, null, 2).split("\n");
            file.contents = Buffer.from(lines.join(os.EOL));
            this.push(file);
        } catch (err) {
            this.emit(
                "error",
                new PluginError("packageJsonFormatter", err, {
                    fileName: file.path,
                }),
            );
        }
        cb();
    });
};

module.exports = Utils;
