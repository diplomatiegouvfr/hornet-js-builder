"use strict";
module.exports = WebPackComponentTransformer;
var fs = require("fs");
var helper = require("../helpers");
var path = require("path");
var loaderUtils = require("loader-utils");
var JSON5 = require("json5");

function WebPackComponentTransformer(content) {
    this.cacheable();

    var query = loaderUtils.parseQuery(this.query);
    var currentFilePath = this.resourcePath;
    //On gère le cas où le fichier ne contient pas le texte, dans ce cas pas de modification
    if (content.indexOf(query.replaceText) === -1) {
        helper.debug("[webpack]: Ignore du fichier ", currentFilePath);
        return content;
    }

    helper.debug("[webpack]: Conf de WebPackComponentTransformer: ", query);

    var newLine = "\r\n";
    var addContent = "// [AUTO GENERATED] DO NOT EDIT THIS FUNCTION DIRECTLY" + newLine;
    var firstIf = true;

    var currentFileDir = path.dirname(currentFilePath);
    helper.debug("[webpack]: currentFilePath: ", currentFilePath);
    helper.debug("[webpack]: currentFileDir: ", currentFileDir);

    var sourcesDirs = [];
    var sourcesDir;
    helper.debug("[webpack]: query.sourcesDirs: ", query.sourcesDirs);

    query.sourcesDirs.forEach((pathElt) => {
        sourcesDirs.push(path.join(path.resolve(currentFileDir, pathElt), path.sep));
    });

    helper.debug("[webpack]: sourcesDirs: ", sourcesDirs);

    /**
     * Fonction gérant l'ajout des composants dans la conf webpack
     */
    function handleFile(dir, file) {
        if (helper.endsWith(file, query.fileSuffix)) {
            var fullName = path.join(dir, file);
            helper.debug("[webpack]: Adding:", fullName);

            var extension = path.extname(fullName);
            //helper.debug('File extension:', extension);

            var fileToImport = path.relative(currentFileDir, fullName).replace(/\\/g, "/");
            if (!helper.startsWith(fileToImport, ".")) {
                fileToImport = "./" + fileToImport;
            }
            helper.debug("[webpack]: Relative fileToImport:", fileToImport);

            var chunkName = fullName.replace(sourcesDir, "").replace(extension, "").replace(/\\/g, "/");
            helper.debug("[webpack]: chunkName:", chunkName);

            var tab = ["if (name === '",
                chunkName,
                "') { " + newLine,
                "require(['",
                fileToImport,
                "'], callback);" + newLine,
                "}", newLine];

            if (firstIf) {
                firstIf = false;
            } else {
                tab.splice(0, 0, "else ");
            }

            addContent = addContent + tab.join("");

        } else {
            // console.log('Skipping: ' + dir + file);
        }
    }

    sourcesDirs.forEach((elt) => {
        sourcesDir = elt;

        helper.readDirRecursive(sourcesDir, handleFile);
    });

    if (firstIf) {
        helper.warn("Aucun fichier de type  ", query.fileSuffix, " présent dans le dossier ", sourcesDir);
        addContent = 'callback(\'ERROR: No File with name \\\'\'+name+\'\\\' found\');';
    } else {
        addContent = addContent + 'else{callback(\'ERROR: No File with name \\\'\'+name+\'\\\' found\');}';
    }


    return content.replace(query.replaceText, addContent);
}
