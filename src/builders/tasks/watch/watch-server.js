"use strict";

const _ = require("lodash");
const nodemon = require("gulp-nodemon");

const Task = require("./../task");

/**
 * Gestion du rechargement serveur
 */
class WatchServer extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, breakOnStart, env) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.breakOnStart = breakOnStart;
        this.env = env;
    }

    task(gulp, helper, conf, project) {

        var args = [];
        var debugPort = helper.getDebugPort();
        if (_.isNumber(debugPort) && !_.isNaN(debugPort)) {
            if (this.breakOnStart) {
                args.push("--debug-brk=" + debugPort);
            } else {
                args.push("--debug=" + debugPort);
            }
        }

        return (done) => {

            var confNodemon = {
                watch: [/*conf.src, */conf.config].concat(helper.getExternalModuleDirectories(project)),
                script: project.packageJson.main,
                ext: "html js jsx tsx json css",
                ignore: [conf.targetClientJs],
                nodeArgs: args,
                delay: 3,
                env: {"NODE_ENV": this.env},
                execMap: {
                    js: "node"
                }
            };

            nodemon(confNodemon);
            done();
        }
    }
}


module.exports = WatchServer;