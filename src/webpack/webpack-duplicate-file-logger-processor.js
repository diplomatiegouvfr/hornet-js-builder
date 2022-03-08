module.exports = WebPackFileLogger;
const fs = require("fs");
const path = require("path");
const find = require("lodash.find");
const isEmpty = require("lodash.isempty");
const helper = require("../helpers");

/**
 * Plugin permettant de détecter les doublons de dépendances
 * @type {Array}
 */
const fileList = [];
function WebPackFileLogger(content) {
    this.cacheable();
    const ressourcePath = this.resourcePath;
    let currentDir = path.dirname(ressourcePath);
    let continueLoop = true;

    while (!isEmpty(currentDir) && continueLoop) {
        const currentPackageFile = path.join(currentDir, "package.json");
        if (helper.fileExists(currentPackageFile)) {
            continueLoop = false;
            const currentPackage = require(currentPackageFile);

            const relativeFileName = path.relative(currentDir, ressourcePath);

            const sameVersionDep = find(fileList, byNameAndVersionPredicate(currentPackage));
            if (sameVersionDep) {
                // On check la même version importée 2 fois
                const sameFileInfos = find(sameVersionDep.files, byFileNamePredicate(relativeFileName));
                if (sameFileInfos && sameFileInfos.filePath === ressourcePath) {
                    // Même fichier
                    continue;
                } else if (sameFileInfos) {
                    helper.warn("[webpack]: Fichier importé 2 fois:", sameFileInfos.filePath, "=>", ressourcePath);
                } else {
                    sameVersionDep.files.push({
                        fileName: relativeFileName,
                        filePath: ressourcePath,
                    });
                }
            } else {
                // On check quand même une autre version au cas où
                const nameDep = find(fileList, byNamePredicate(currentPackage));
                if (nameDep) {
                    // helper.info('Librairie ', nameDep.name, ' importée dans 2 versions différentes');
                    const sameFileInfos = find(nameDep.files, byFileNamePredicate(relativeFileName));
                    if (sameFileInfos) {
                        helper.warn(
                            "[webpack]: Fichier importé 2 fois dans des versions différentes (",
                            nameDep.version,
                            "=>",
                            currentPackage.version,
                            "):",
                            sameFileInfos.filePath,
                            "=>",
                            ressourcePath,
                        );
                    }
                }

                // Dans tous les cas on ajoute la dépendance
                fileList.push({
                    name: currentPackage.name,
                    version: currentPackage.version,
                    files: [
                        {
                            fileName: relativeFileName,
                            filePath: ressourcePath,
                        },
                    ],
                });
            }
        } else {
            currentDir = path.resolve(currentDir, `..${path.sep}`);
        }
    }
    return content;
}

function byNamePredicate(pkg) {
    return function (value) {
        return value.name === pkg.name;
    };
}

function byNameAndVersionPredicate(pkg) {
    return function (value) {
        return value.name === pkg.name && value.version === pkg.version;
    };
}

function byFileNamePredicate(fileName) {
    return function (value) {
        return value.fileName === fileName;
    };
}
