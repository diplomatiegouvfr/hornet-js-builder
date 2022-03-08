const fs = require("fs");
const path = require("path");
const Helper = require("./helpers");

class ModuleHelper {}

/**
 * Lit un repertoire de manière récursive en applicant le callback sur chaque dossier,
 *  le callback doit retourner une valeur autre que false pour lire le sous dossier
 * @param {Object} parent représentation du module parent
 * @param {String} dir répertoire à llister
 * @param {Function} callback fonction appelée pour les sous-répertoires
 */
ModuleHelper.readDirRecursiveAndCallBackOnDir = function (parent, dir, callback) {
    const files = fs.readdirSync(dir);

    files.forEach(function (file) {
        const nextRead = path.join(dir, file);
        let stats = fs.lstatSync(nextRead);
        if (stats.isSymbolicLink()) {
            stats = fs.lstatSync(fs.realpathSync(nextRead));
        }

        if (stats.isDirectory()) {
            const parentModule = callback(dir, file, parent);
            if (parentModule) {
                ModuleHelper.readDirRecursiveAndCallBackOnDir(parentModule, nextRead + path.sep, callback);
            }
        }
    });
};

module.exports = ModuleHelper;
