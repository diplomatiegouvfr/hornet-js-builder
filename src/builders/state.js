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
 * Dépendances du parent
 * @static
 */
State.moduleList = {};

/**
 * prefix pour les install specifique
 */
State.prefix = "";

/**
 * Historique des taches lancées
 * @static
 */
State.taskHistory = {};


/**
 * Resultat afficher en fin de traitement
 */
State.result = undefined;

module.exports = State;
