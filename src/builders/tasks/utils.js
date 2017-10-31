"use strict";

const del = require("del");
const path = require("path");
const gutil = require("gulp-util");
const through = require("through2");
const _ = require("lodash");
const os = require("os");

const Utils = function () {
};


Utils.gulpDelete = (helper, patterns) => {
    return (done) => {
        del(patterns).then(
            (paths) => {
                helper.debug("Deleted files and folders:\n", paths.join("\n"));
                return done();
            }, (err) => {
                // Rejet de la promesse
                return done(err);
            }
        );
    };
}
/**
 * Fonction retournant une fonction de mapping ajoutant les arguments après ceux du tableau sur lequel s'applique le mapping
 * @param ...args les arguments à ajouter
 * @returns {Function}
 */
Utils.append = () => {
    var args = Array.prototype.slice.call(arguments, 0);
    return (element) => {
        if (args.length === 1) {
            if (args[0] === "!") {
                return element + args[0];
            } else {
                return path.join(element, args[0]);
            }
        } else {
            return args.map((argElement) => {
                return path.join(element, argElement);
            });
        }
    };
};

/**
 * Fonction retournant une fonction de mapping ajoutant les arguments avant ceux du tableau sur lequel s'applique le mapping
 * @param ...args les arguments à ajouter
 * @returns {Function}
 */
Utils.prepend = () => {
    var args = Array.prototype.slice.call(arguments, 0);
    return (element) => {
        if (args.length === 1) {
            if (args[0] === "!") {
                return args[0] + element;
            } else {
                return path.join(args[0], element);
            }
        } else {
            return args.map((argElement) => {
                return path.join(argElement, element);
            });
        }
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
    var arr = desc.split(".");
    while(arr.length && (obj = obj[arr.shift()]));
    return obj;
}

/**
 * Résoud dans un objet JSON les propriétés référençant d'autre propriétés. (ex: myProp: ${x.y.z})
 *
 * @param obj Object sous format JSON
 */
Utils.checkVariables = (obj) => {
    var parent = obj;
    var isModeDockerGoOn_check = function (obj, parent) {
        var retry = false;
        for (var i in obj) {
            var type = typeof obj[i];
            if (type === "function")
                continue;
            if (type === "object") {
                retry |= isModeDockerGoOn_check(obj[i], parent);
            }
            else if (type === "string") {
                var variables = obj[i].match(/\$\{[^\}]+\}/g);
                if (variables && variables.length > 0) {
                    retry = true;
                    variables.forEach(function (variable) {
                        obj[i] = obj[i].replace(variable, Utils.getDescendantProp(parent, variable.substring(2, variable.length - 1)));
                    });
                }
            }
        }
        return retry;
    };
    if (isModeDockerGoOn_check(obj, parent)) {
        Utils.checkVariables(obj);
    }
};


Utils.absolutizeModuleRequire = (helper, project, extensions, onlyExtensions) => {
    // require('src/aaa/bbb') > require('hornet-js-core/src/aaa/bbb')
    var regexRequire = /require\(["'](src\/[\w\-\/\.]*)["']\)/;
    var regexImportExportFrom = /(import|export)[\s]*(.*)[\s]*from[\s]*["'](src\/[\w\-\/]*)["']/;
    var extensionAbsolutize = extensions || [".js", ".tsx", ".jsx", ".json"]

    var testFileExistWithExtensions = function (fileName, lExt) {
        if (path.extname(fileName).length > 0) {
            return helper.fileExists(fileName);
        } 
        for(let i = 0; i < lExt.length; i++) {
            if (helper.fileExists(fileName + lExt[i])) {
                return true;
            }
        }
        return false;
    }

    return through.obj(function(file, enc, cb) {
        if (file.isNull()) {
            cb(null, file);
            return;
        }

        if (file.isStream()) {
            cb(new gutil.PluginError("absolutizeModuleRequire", "Streaming not supported"));
            return;
        }

        try {
            if (!onlyExtensions || onlyExtensions.indexOf(file.extname) > -1 ) {
                var content = file.contents.toString()/*.replace(/declare /g, '')*/.replace(/\r\n/g, "\n"),
                    lines = content.split("\n");

                // remplacement des require("src/...") par require("<moduleName>/src/...") OU
                // remplacement des import ... from "src/..." par import ... from "<moduleName>/src/..." OU
                // remplacement des export from "src/..." par export from "<moduleName>/src/..." OU
                lines = _.map(lines, function (line) {
                    var processedLine = line,
                        matches = regexRequire.exec(line),
                        matches2 = regexImportExportFrom.exec(line);

                    if (matches) {
                        var required = matches[1];
                        if (testFileExistWithExtensions(path.join(project.dir, required), extensionAbsolutize)) {
                            required = project.name + "/" + required;
                            processedLine = line.replace(regexRequire, "require(\"" + required + "\")");
                        }
                    } else if (matches2) {
                        var requiredType = matches2[1],
                            required = matches2[2],
                            requiredSrc = matches2[3];
                        if (testFileExistWithExtensions(path.join(project.dir, requiredSrc), extensionAbsolutize)) {
                            requiredSrc = project.name + "/" + requiredSrc;
                            processedLine = line.replace(regexImportExportFrom, requiredType + " " + required + " from \"" + requiredSrc + "\"");
                        }

                    }
                    return processedLine;
                });

                file.contents = new Buffer(lines.join("\n"));
            }
            this.push(file);
        } catch (err) {
            this.emit("error", new gutil.PluginError("absolutizeModuleRequire", err, {
                fileName: file.path
            }));
        }

        cb();
    });
}

Utils.systemPathToRequireName = (systemPath) => {
    return systemPath.replace(/\\/g, "/");
}


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
                var newSources = file.sourceMap.sources.map(function (sourceMapFile) {
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
};

Utils.packageJsonFormatter = (helper, project) => {
    return through.obj(function(file, enc, cb){
        if (file.isNull()) {
            cb(null, file);
            return;
        }

        if (file.isStream()){
            cb(new gutil.PluginError("packageJsonFormatter", "Streaming not supported"));
            return;
        }

        try {
            let hashes = [];
            let packageJsonCopy = _.merge({}, project.packageJson);
            if (packageJsonCopy[helper.HB_JSON_KEY]) {
                Object.keys(packageJsonCopy[helper.HB_JSON_KEY].history).forEach(function(hash) {
                    packageJsonCopy[helper.HB_JSON_KEY].history[hash].deps = {};
                    hashes.push(hash);
                });
            }
            let checkreplace = false;
            let replaceIdx = -1;
            let lines = JSON.stringify(packageJsonCopy, null, 2).split("\n");
            let hashIdx = 0;
            for (let i=0;i<lines.length;i++) {
                if (lines[i].indexOf(helper.HB_JSON_KEY) != -1) {
                    for (let j=0;j<5;j++) {
                        lines.splice(i, 0, "");
                        i++;
                    }
                    checkreplace = true;
                } else if (lines[i].indexOf(hashes[hashIdx]) != -1) {
                    replaceIdx = hashIdx;
                } else if (replaceIdx != -1 && lines[i].indexOf("\"deps\": {}") != -1) {
                    lines[i] = lines[i].replace("{}", JSON.stringify(project.packageJson[helper.HB_JSON_KEY].history[hashes[hashIdx]].deps));
                    hashIdx++;
                    replaceIdx = -1;
                }
            }
            file.contents = new Buffer(lines.join(os.EOL));
            this.push(file);
        } catch (err) {
            this.emit("error", new gutil.PluginError("packageJsonFormatter", err, {
                fileName: file.path
            }));
        }
        cb();
    });
};

module.exports = Utils;