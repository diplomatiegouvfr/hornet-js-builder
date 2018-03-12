"use strict";

/**
 * Classe déchange d'informations entre les différentes tâches
 */
class State {
}

/**
 * rapport pour l'état et l'arbre des dépendances
 * @static
 */
State.report = null;

/**
 * rapport pour l'état et l'arbre des dépendances des fixed
 * @static
 */
State.reportFixed = null;

/**
 * Marqueur de changement des dépendances applicatives (pour opimiser les temps)
 * @static
 */
State.appDependenciesChanged = true;

/**
 * Marqueur de changement des dépendances de test (pour opimiser les temps)
 * @static
 */
State.testDependenciesInstalled = {};

/**
 * Dépendances externes trouvées
 * @static
 */
State.externalDependencies = {};

/**
 * Informations du module parent
 * @static
 */
State.parentBuilder = {};

/**
 * Dépendances avec script install
 * @static
 */
State.reportScript = {};

/**
 * sauvegarde des requetes NPM
 * @static
 */
State.reportNpmSearchVersion = {};


/**
 * Dépendances du parent
 * @static
 */
State.moduleList = {};

/**
 * prefix pour les install specifique
 */
State.prefix = "";


/**
 * Resultat afficher en fin de traitement
 */
State.result = undefined;

/**
 * Retourne un nouveau rapport de dépendences en supprimants des dépendences et celles tirées par ces dernières
 * @param {Array<String>} deps Liste des dépendences à supprimer du rapport
 * @param {Object} otherReport Rapport à utiliser, sinon c'est celui en interne qui est utilisé
 * @static
 */
State.clearDeps = function(deps, otherReport) {

    let report = otherReport || State.report;
    let depsToVerify = {};

    for(let i = 0; i < deps.length; i++) {
        if (report[deps[i]]) {
            for(let version in report[deps[i]]) {
                for(let childDep in report[deps[i]][version].deps) {
                    if (depsToVerify[childDep]) {
                        depsToVerify[childDep].push(report[deps[i]][version].deps[childDep])
                    } else {
                        depsToVerify[childDep] = [report[deps[i]][version].deps[childDep]];
                    }
                }   
            }
            delete report[deps[i]];
        }
    }
    
    for(let depToVerify in depsToVerify) {
        for(let dep in report) {
            for(let version in report[dep]) {
                for(let childDep in report[dep][version].deps) {
                    if(depToVerify == childDep) {
                        delete depsToVerify[depToVerify];
                        break;
                    }
                }
                if(!depsToVerify[depToVerify]) {
                    break;
                }
            }
            if(!depsToVerify[depToVerify]) {
                break;
            }
        }
    }

    if (Object.keys(depsToVerify) > 0) {
        report = State.clearDeps(Object.keys(depsToVerify), report);
    }


    return report;
}

/**
 * Retourne un nouveau rapport de dépendences en filtrants des dépendences et celles tirées par ces dernières
 * @param {boolean} full indicateur de filtre sur les sous-dépendences tirées
 * @param {Array<String>} deps Liste des dépendences à filtrer du rapport
 * @param {Object} otherReport Rapport à utiliser, sinon c'est celui en interne qui est utilisé
 * @static
 */
State.filterDeps = function(full, deps, otherReport) {

    let report = otherReport || State.report;
    let depsToEclude = {};
    let depsToVerify = {};
    let newDeps = true;

    for(let dep in report) {
        let finded = false;
        if(!deps[dep]) {
            depsToEclude[dep] = report[dep];
        } else {
            delete report[dep];
        }
    }

    // ajoute les sous-dépendences
    if (full) {
        while(report && newDeps) {
            newDeps = false;
            for(let dep in report) {
                for(let version in report[dep]) {
                    for(let childDep in report[dep][version].deps) {
                        if (!report[childDep]) {
                            report[childDep] = depsToEclude[childDep]
                            newDeps = true;
                        }
                    }
                }
            }
        }
    }

    return report;
}

module.exports = State;
