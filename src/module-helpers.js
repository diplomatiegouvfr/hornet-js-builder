"use strict";
const Helper = require("./helpers");
const fs = require("fs");
const path = require("path");

class ModuleHelper {

}

/**
 * Renvoit la représentation de l'arborescence de tous le modules trouvés "<name>@<version>"
 * @param {String} dir répertoire dans lequel chercher les modules ex : mon_project/node_modules
 */
ModuleHelper.getArborescence = function (dir) {

  let deps  = ModuleHelper.getModuleListFromDir(dir);
  let arbo = {};
  let level = 1;

  // premiere passe, on les modules de premier niveaux
  let main = deps.filter(dep => dep.level == 0);
  main.forEach(dep => arbo[dep.name + "@" + dep.version] = {})

  // on recré l'arborescence niveau par niveau
  let levelFind = true;

  while(levelFind) {
    levelFind = false;
    deps.forEach((dep) => {
      if(dep.level == level) {
        levelFind = true;
        constructArbo(arbo, dep);
      }
    });
    level++;
  }

  return arbo;

  /**
   * contrrruit l'obet d'arborescence suivant une dépendance
   * @param {Object} arbo l'arborescence des modules
   * @param {Object} dep représentation d'un module
   */
  function constructArbo(arbo, dep) {
    let parts = [];
    getPropertyPath(dep, parts);
    let o = arbo;
    if (parts.length > 1) {
      for (var i = 0; i < parts.length - 1; i++) {
          if (!o[parts[i]])
              o[parts[i]] = {};
          o = o[parts[i]];
      }
    }

    o[parts[parts.length - 1]] = {...dep};
  }

  /**
   * Complète le chemin d'accès d'un module dans l'objet d'arborescence
   * @param {Object} dep représentation d'un module
   * @param {Array} propertyPath chemin acces de la dépendance
   */
  function getPropertyPath(dep, propertyPath) {
    propertyPath.unshift(dep.name + "@" + dep.version)
    if(dep.parent) {
      getPropertyPath( dep.parent, propertyPath);
    }
  }
};


/**
 * Renvoit la représentation de l'arborescence de tous le modules trouvés "<name>@<version>"
 * @param {String} dir répertoire dans lequel chercher les modules ex : mon_project/node_modules
 */
ModuleHelper.dedupeArborescence = function (dir, project, conf) {

    let deps  = ModuleHelper.getModuleListFromDir(dir);
    let arbo = {};
    let level = 1;
  
    // premiere passe, on les modules de premier niveaux
    let main = deps.filter(dep => dep.level == 0);
    main.forEach(dep => arbo[dep.name + "@" + dep.version] = {name: dep.name, version: dep.version, dirs: []})
  
    // on recré l'arborescence niveau par niveau
    let levelFind = true;
  
    while(levelFind) {
      levelFind = false;
      deps.forEach((dep) => {
        if(dep.level == level) {
          levelFind = true;
          if(conf.tscOutDir && dep.dir.indexOf(path.resolve(project.dir, conf.tscOutDir)) == -1) {
            constructArbo(arbo, dep);
          } else if (!conf.tscOutDir) {
            constructArbo(arbo, dep);
          }
        }
      });
      level++;
    }
    return arbo;
  
    /**
     * contrrruit l'obet d'arborescence suivant une dépendance
     * @param {Object} arbo l'arborescence des modules
     * @param {Object} dep représentation d'un module
     */
    function constructArbo(arbo, dep) {
      let o = arbo;

      if(o[dep.name + "@" + dep.version] && Array.isArray(o[dep.name + "@" + dep.version].dirs) && o[dep.name + "@" + dep.version].dirs.length > 0) {
        o[dep.name + "@" + dep.version].dirs.push(dep.dir);
      } else {
        o[dep.name + "@" + dep.version] = {name: dep.name, version: dep.version, dirs: [dep.dir]}
      }
    }
  
  };

/**
 * Renvoit la liste de tous le modules trouvés "<name>@<version>"
 * @param {String} dir répertoire dans lequel chercher les modules ex : mon_project/node_modules
 */
ModuleHelper.getModulesList = function (dir) {
  let deps  = ModuleHelper.getModuleListFromDir(dir);
  let list = {};

  deps.forEach(dep => list[dep.name + "@" + dep.version] = {});

  return list;
}

/**
 * renvoit la liste des modules trouvés dans un répertoire
 * @param {String} dir répertoire dans lequel chercher les modules ex : mon_project/node_modules
 */
ModuleHelper.getModuleListFromDir = function (dir) {
  var moduleList = [];


  ModuleHelper.readDirRecursiveAndCallBackOnDir(null, dir, (dir, file, parent) => {
    var packagePath = file ? path.join(dir, file, "package.json") : path.join(dir, "package.json");
    if(file === Helper.NODE_MODULES) {
      return parent || ModuleHelper.getProjectDescription(dir, parent);
    }
    if (!fs.existsSync(packagePath)) {
      // pas de package.json, pas un module
      return false;
    }
    
    let project = ModuleHelper.getProjectDescription(path.join(dir, file), parent);

    moduleList.push(project);
    return project;
  });

  return moduleList;
};

/**
 * Lit un repertoire de manière récursive en applicant le callback sur chaque dossier,
 *  le callback doit retourner une valeur autre que false pour lire le sous dossier
 * @param {Object} parent représentation du module parent
 * @param {String} dir répertoire à llister
 * @param {Function} callback fonction appelée pour les sous-répertoires
 */
ModuleHelper.readDirRecursiveAndCallBackOnDir = function (parent, dir, callback) {

  var files = fs.readdirSync(dir);

  files.forEach(function (file) {
      var nextRead = path.join(dir, file);
      var stats = fs.lstatSync(nextRead);
      if(stats.isSymbolicLink()) {
        stats = fs.lstatSync(fs.realpathSync(nextRead));
      }
      
      if (stats.isDirectory()) {
        let parentModule = callback(dir, file, parent);
        if (parentModule) {
            ModuleHelper.readDirRecursiveAndCallBackOnDir(parentModule, nextRead + path.sep, callback);
        }
      }
  });
};

/**
 * renvoit la représentation d'un module si un fichier package.json existe
 * @param {String} dir répertoire dans lequel chercher les modules ex : mon_project/node_modules
 * @param {Object} parent représentation du module parent
 * @returns {Object} représentation du module
 */
ModuleHelper.getProjectDescription = function (dir, parent) {
  let packageJsonPath = path.join(dir, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
      console.error("Le module doit avoir un fichier package.json (dir=" + dir + ")");
      process.exit(1);
  }

  let packageJson = require(packageJsonPath);

  return {
      name: packageJson.name,
      version: packageJson.version,
      dir: dir,
      packageJsonPath: packageJsonPath,
      parent: parent,
      level: parent ? parent.level + 1 : 0
  };
};

module.exports = ModuleHelper;