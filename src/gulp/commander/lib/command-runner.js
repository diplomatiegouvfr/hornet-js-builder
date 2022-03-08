const { spawn } = require("child_process");
const Helper = require("../../../helpers");

/**
 * Appelle une commande en l'englobant d'une promesse
 * @param {{cmd: string, args:string[], cwd: string}} command d'exécution de la commande (commande, argument, chamin d'exécution)
 * @param {boolean} continueOnError permet de forcer la résolution même avec un code retour != 0
 * @param {function} dataStderrCallback callback appelée pour la sortie stdErr
 */
exports.run = function (command, continueOnError, dataStderrCallback, returnData) {
    return new Promise((resolve, reject) => {
        Helper.debug(`${command.cmd} ${command.args} in cwd: ${command.cwd || process.cwd()}`);
        const cmd = spawn(quoteIfNecessary(command.cmd), command.args, { shell: true, stdio: "pipe", cwd: command.cwd || process.cwd() });
        let resultData = "";
        cmd.stdout.on("data", (data) => {
            Helper.debug(`${data}`);
            resultData = `${resultData}${data}`;
        });

        cmd.stderr.on(
            "data",
            dataStderrCallback ||
                ((data) => {
                    Helper.error(`${data}`);
                }),
        );

        cmd.on("close", (code) => {
            if (code !== 0 && !continueOnError) {
                return reject(new Error(`"${command.cmd}" exited with non-zero code ${code}`));
            }
            resolve((returnData && resultData) || code);
        });
    });
};

function quoteIfNecessary(command) {
    return /\s+/.test(command) ? `"${command}"` : command;
}
