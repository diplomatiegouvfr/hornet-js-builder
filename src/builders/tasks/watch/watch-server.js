const fs = require("fs");
const path = require("path");
const nodemon = require("gulp-nodemon");
const isNaN = require("lodash.isnan");
const isNumber = require("lodash.isnumber");
const semver = require("semver");
const commander = require("../../../gulp/commander");
const Task = require("../task");

/**
 * Gestion du rechargement serveur
 */
class WatchServer extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, breakOnStart, env) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.breakOnStart = breakOnStart;
        this.env = env;
        this.nodeCompVersion = true;

        commander
            .toPromise({ cmd: "node", args: ["-v"], cwd: project.dir }, true, undefined, true)
            .then((result) => {
                this.nodeCompVersion = semver.gt(semver.coerce(result), "10.0.0");
            })
            .catch((err) => {
                helper.warn(`Erreur durant l'exécution de la commande node version, ERROR: ${err}`);
            });
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            helper.debug("nodeCompVersion 10 :", this.nodeCompVersion);
            const args = this.nodeCompVersion ? ["--preserve-symlinks", "--preserve-symlinks-main"] : ["--preserve-symlinks"];
            const debugPort = helper.getDebugPort();
            if (isNumber(debugPort) && !isNaN(debugPort)) {
                if (this.breakOnStart) {
                    args.push(`--inspect-brk=${debugPort}`);
                } else {
                    args.push(`--inspect=${debugPort}`);
                }
            }

            const confNodemon = {
                watch: [conf.config, conf.static].concat(helper.getExternalModuleDirectories(project)),
                ignore: [
                    `${conf.target.src}/**/*.js*`,
                    `${conf.target.test}/**/*.js*`,
                    conf.tscOutDir && !project.packageJson.main.includes(conf.tscOutDir) ? path.join(conf.tscOutDir, project.packageJson.main) : project.packageJson.main,
                    "package.json",
                ],
                script: project.packageJson.main,
                ext: "html js json css",
                nodeArgs: args,
                delay: process.env.HB_WATCH_DELAY || 2500, // attention ms
                env: { NODE_ENV: this.env },
                execMap: {
                    js: "node",
                },
                cwd: conf.tscOutDir && !project.packageJson.main.includes(conf.tscOutDir) ? conf.tscOutDir : undefined,
            };

            if (conf.node && conf.node.env) {
                confNodemon.env = { ...confNodemon.env, ...conf.node.env };
            }

            if (helper.isIDE()) {
                confNodemon.ignore = [];
                confNodemon.watch.push("./**/*.js*");
            }
            const myNodemon = nodemon(confNodemon);
            myNodemon
                .on("restart", (files) => {
                    helper.info("restarted :", files);
                })
                .on("start", () => {
                    helper.__nodemon = true;
                    helper.info("nodemon started.");
                })
                .on("exit", () => {
                    helper.__nodemon = false;
                    helper.info("nodemon exited.");
                });
            helper.__myNodemon__ = myNodemon;
        };
    }
}

module.exports = WatchServer;
