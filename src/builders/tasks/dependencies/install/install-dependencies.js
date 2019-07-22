"use strict";
const helper = require("../../../../helpers");
const Task = require("./../../task");
const path = require("path");
const State = require("../../../state");
const commander = require("../../../../gulp/commander");

class InstallDependencies extends Task {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.addOn = {
        }
    }


    /**
     * Lance l'exécution d'unee commande npm
     * @param { Object } project descripteur du projet
     * @param { Helper } helper
     * @param { string } command commande npm à exécuter
     * @param { Array } args paraètre de la commande
     */
    runNpmCommand(project, helper, command, args, continueOnError) {
        helper.info("Lancement de la commande npm ", command);
        
        return new Promise( (resolve, reject) => {
            commander.toPromise({cmd: "npm", args: [command].concat(...args), cwd: project.dir}, continueOnError).then(() => { 
                return resolve();
            }).catch((err)=> {
                helper.warn("Erreur durant l'exécution de la commande npm : " + command + ", ERROR: "+ err);
                reject(err);
            });
        });
    }
}

module.exports = InstallDependencies;