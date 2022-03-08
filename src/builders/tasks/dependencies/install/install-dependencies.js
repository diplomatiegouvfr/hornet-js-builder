const commander = require("../../../../gulp/commander");
const Task = require("../../task");

class InstallDependencies extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
    }

    /**
     * Lance l'exécution d'unee commande npm
     * @param { Object } project descripteur du projet
     * @param { Helper } helper
     * @param { string } command commande npm à exécuter
     * @param { Array } args paramètre de la commande
     * @param { boolean } continueOnError continue en cas d'erreur
     * @param { string } cwd chemin dans lequel exécuter la commande
     */
    runNpmCommand(project, helper, command, args, continueOnError, cwd) {
        helper.info("Lancement de la commande npm ", command);

        return new Promise((resolve, reject) => {
            commander
                .toPromise({ cmd: "npm", args: [command].concat(...args), cwd: cwd || project.dir }, continueOnError)
                .then(() => {
                    return resolve();
                })
                .catch((err) => {
                    helper.warn(`Erreur durant l'exécution de la commande npm : ${command}, ERROR: ${err}`);
                    reject(err);
                });
        });
    }

    /**
     * Installe une dépendance app dans un répertoire spécifique (décompactage sans sous-dépendances)
     * @param { Object } project descripteur du projet
     * @param { Array } dependencies
     * @param { Helper } helper
     * @param { string } command commande npm à exécuter
     * @param { string } cwd chemin dans lequel exécuter la commande
     */
    static installDependencyCmd(project, helper, npmArgs, dependencies, cwd) {
        helper.info(`Lancement installation des dépendances du projet ${project.name}, Npm args: ${npmArgs}`);

        return new Promise((resolve, reject) => {
            const args = npmArgs || ["install"];

            if (helper.isOfflineMode()) {
                args.push("--offline");
            }

            if (helper.getRemainingArgs()) {
                args.push(helper.getRemainingArgs());
            }

            helper.info(`args ${args}, dependencies: ${dependencies}, cwd: ${cwd}`);
            return commander
                .toPromise({ cmd: "npm", args: args.concat(dependencies), cwd: cwd || project.dir }, false, (data) => {
                    if (/(err!)|(error)/i.exec(`${data}`)) {
                        helper.error(`${data}`);
                    } else {
                        helper.info(`${data}`);
                    }
                })
                .catch((err) => {
                    helper.error(`Erreur durant l'installation de la dépendance : ${project.name}, ERROR: ${err}`);
                    reject(err);
                    process.exit(1);
                })
                .then((value) => {
                    resolve(value);
                });
        });
    }
}

module.exports = InstallDependencies;
