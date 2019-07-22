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
                watch: [conf.config, conf.static].concat(helper.getExternalModuleDirectories(project)),
                ignore: [conf.tscOutDir ? conf.tscOutDir + "/**/*.js*" : conf.src + "/**/*.js*", conf.targetClientJs],
                script: project.packageJson.main,
                ext: "html js json css",
                nodeArgs: args,
                delay: 3,
                env: { "NODE_ENV": this.env },
                execMap: {
                    js: "node"
                }
            };

            nodemon(confNodemon).on('restart', function (files) {
                console.log('restarted :', files)
            });
        }
    }
}


module.exports = WatchServer;