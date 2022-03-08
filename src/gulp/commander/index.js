const path = require("path");
const dargs = require("dargs");
const groupBy = require("lodash.groupby");
const PQueue = require("p-queue");
const through2 = require("through2");
const Helper = require("../../helpers");
const commandRunner = require("./lib/command-runner");

const defaultCommands = {
    npm: ["install"],
};

const defaultFileToCommand = {
    "package.json": "npm",
};

const noop = () => {};

module.exports = {
    gulpPlugin(opts = {}, done = noop) {
        if (typeof opts === "function") {
            done = opts;
            opts = {};
        }
        const fileToCommand = { ...defaultFileToCommand, ...opts.commands };
        const toRun = [];

        return through2(
            { objectMode: true },
            function (file, enc, cb) {
                if (!file.path) {
                    return cb();
                }
                console.log("getRemainingArgs :", Helper.getRemainingArgs());
                const commander = opts.command || fileToCommand[path.basename(file.path)];

                if (commander) {
                    const cmd = {
                        cmd: commander,
                        args: (opts.args || Helper.getRemainingArgs() || defaultCommands[commander] || []).slice(),
                    };

                    if (opts.args) {
                        cmd.args = cmd.args.concat(opts.args).map((arg) => arg.toString());
                    }
                    if (Array.isArray(opts[cmd.cmd])) {
                        cmd.args = cmd.args.concat(opts[cmd.cmd].map((arg) => arg.toString()));
                    } else if (typeof opts[cmd.cmd] === "object") {
                        cmd.args = cmd.args.concat(dargs(opts[cmd.cmd]));
                    } else if (opts[cmd.cmd]) {
                        cmd.args = cmd.args.concat(opts[cmd.cmd].toString());
                    }

                    cmd.cwd = path.dirname(file.path);
                    toRun.push(cmd);
                }
                this.push(file);
                cb();
            },
            (cb) => {
                if (toRun.length === 0) {
                    return cb();
                }

                const groupedCommands = groupBy(toRun, "cmd");
                return Promise.all(
                    Object.keys(groupedCommands).map((cmd) => {
                        const commands = groupedCommands[cmd];
                        const queue = new PQueue({ concurrency: 1 });
                        return Promise.all(commands.map((command) => queue.add(() => commandRunner.run(command))));
                    }),
                )
                    .then(() => done())
                    .then(() => cb(), cb);
            },
        );
    },
    /**
     * Appelle une commande englobée dans une promesse
     * @param {{cmd: string, args:string[], cwd: string}} option d'exécution de la commande (commande, argument, chamin d'exécution)
     * @param {boolean} continueOnError permet de forcer le code retour à 0
     * @param {function} dataStderrCallback callback appelée pour la sortie stdErr
     * @param {boolean} returnData  permet de renvoyer les données à la place du code retour
     */
    toPromise(opts, continueOnError, dataStderrCallback, returnData = false) {
        if (!opts.cmd) {
            throw new Error("no command in option.");
        }

        const cmd = {
            cmd: opts.cmd,
            args: opts.args || [],
            cwd: opts.cwd,
        };

        return commandRunner.run(cmd, continueOnError, dataStderrCallback, returnData);
    },
};
