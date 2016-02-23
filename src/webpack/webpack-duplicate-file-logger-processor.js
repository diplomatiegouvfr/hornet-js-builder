"use strict";
module.exports = WebPackFileLogger;
var path = require("path");
var fs = require("fs");
var helper = require("../helpers");
var _ = require("lodash");

/**
 * Plugin permettant de détecter les doublons de dépendances
 * @type {Array}
 */
var fileList = [];
function WebPackFileLogger(content) {
    this.cacheable();
    var ressourcePath = this.resourcePath;
    //helper.debug('Fichier courant:', ressourcePath);
    var currentDir = path.dirname(ressourcePath);
    var continueLoop = true;

    while (!_.isEmpty(currentDir) && continueLoop) {
        var currentPackageFile = path.join(currentDir, "package.json");
        //helper.debug('Test package:', currentPackageFile);
        if (helper.fileExists(currentPackageFile)) {
            continueLoop = false;
            var currentPackage = require(currentPackageFile);

            var relativeFileName = path.relative(currentDir, ressourcePath);
            //helper.debug('relativeFileName:', relativeFileName);

            var sameVersionDep = _.find(fileList, byNameAndVersionPredicate(currentPackage));
            if (sameVersionDep) {
                //On check la même version importée 2 fois
                var sameFileInfos = _.find(sameVersionDep.files, byFileNamePredicate(relativeFileName));
                if (sameFileInfos && sameFileInfos.filePath === ressourcePath) {
                    //Même fichier
                    continue;
                } else if (sameFileInfos) {
                    helper.warn("[webpack]: Fichier importé 2 fois:", sameFileInfos.filePath, "=>", ressourcePath);
                } else {
                    sameVersionDep.files.push({
                        fileName: relativeFileName,
                        filePath: ressourcePath
                    });
                }
            } else {
                //On check quand même une autre version au cas où
                var nameDep = _.find(fileList, byNamePredicate(currentPackage));
                if (nameDep) {
                    //helper.info('Librairie ', nameDep.name, ' importée dans 2 versions différentes');
                    var sameFileInfos = _.find(nameDep.files, byFileNamePredicate(relativeFileName));
                    if (sameFileInfos) {
                        helper.warn("[webpack]: Fichier importé 2 fois dans des versions différentes (",
                            nameDep.version, "=>", currentPackage.version, "):", sameFileInfos.filePath, "=>", ressourcePath);
                    }
                }

                //Dans tous les cas on ajoute la dépendance
                fileList.push({
                    name: currentPackage.name,
                    version: currentPackage.version,
                    files: [{
                        fileName: relativeFileName,
                        filePath: ressourcePath
                    }]
                });
            }
        } else {
            currentDir = path.resolve(currentDir, ".." + path.sep);
        }
    }
    return content;
}


function byNamePredicate(pkg) {
    return function (value) {
        return value.name === pkg.name;
    }
}

function byNameAndVersionPredicate(pkg) {
    return function (value) {
        return value.name === pkg.name && value.version === pkg.version;
    }
}

function byFileNamePredicate(fileName) {
    return function (value) {
        return value.fileName === fileName;
    }
}
