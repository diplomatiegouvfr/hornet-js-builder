const Task = require("../task");

let timeout = null;

/**
 * Gestion du rechargement serveur
 */
class RestartServer extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            if (helper.__nodemon) {
                (() => {
                    if (timeout) clearTimeout(timeout);
                    timeout = setTimeout(() => {
                        timeout = null;
                        helper.__myNodemon__.restart();
                    }, process.env.HB_RESTART_DELAY || (project.type === helper.TYPE.APPLICATION ? 5000 : 1000));
                    return undefined;
                })();
            }
            done();
        };
    }
}

module.exports = RestartServer;
