"use strict";

const isNumber = require ("lodash.isnumber");
const isNaN = require ("lodash.isnan");
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
        if (isNumber(debugPort) && !isNaN(debugPort)) {
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
                script: conf.tscOutDir ? path.join(conf.tscOutDir + project.packageJson.main) : project.packageJson.main,
                ext: "html js json css",
                nodeArgs: args,
                delay: process.env.HB_WATCH_DELAY || 250, // attention ms
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