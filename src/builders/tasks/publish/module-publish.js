"use strict";

const Task = require("./../task");
const Utils = require("../utils");
const vfs = require("vinyl-fs");
const path = require("path");
const commander = require("../../../gulp/commander");

/**
 * Fonction générique de recopie de fichiers vers le repertoire de destination
 */
class ModulePublish extends Task {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.extensions = [".js", ".tsx", ".json", ".jsx"]

    }

    task(gulp, helper, conf, project) {
        return (done) => {

            let stream = [];

            if (conf.tscOutDir) {
                let absOutDir = path.join(project.dir, conf.target.ts);
                let streamCopyJs = vfs.src(
                    [...(["/**/*.js", "/**/*.d.ts", "/**/*.js.map"].map(helper.prepend(absOutDir))), 
                    ...([conf.test, conf.test + "/**/*"].map(helper.prepend("!" + absOutDir)))
                ], { base: absOutDir })
                    .pipe(Utils.absolutizeModuleRequire(helper, project, this.extensions, [".js", ".jsx"]))
                    .pipe(gulp.dest(path.join(project.dir, "tmpPublish")));
                streamCopyJs.on("error", () => {
                    helper.error("Error publish : " + arguments);
                });
                stream.push(streamCopyJs);

                let streamCopyNoJs = vfs.src(
                    ["**/*", 
                    "!definition-ts", 
                    "!definition-ts/**/*", 
                    "!" + conf.generatedTypings.dir, 
                    "!" + conf.generatedTypings.dir + "/**/*", 
                    "!**/*.tsx", 
                    "!**/*.ts", 
                    "!*.js", 
                    "!*.js.map", 
                    "!node_modules/**/*", 
                    "!node_modules", 
                    "!" + conf.test, 
                    "!" + conf.test + "/**/*", 
                    "!" + conf.testReportDir, 
                    "!" + conf.testReportDir + "/**/*", 
                    "!" + conf.testWorkDir, 
                    "!" + conf.testWorkDir + "/**/*", 
                    "!" + conf.testWorkDir, 
                    "!" + conf.testWorkDir + "/**/*", 
                    "!" + conf.environment.dir, 
                    "!" + conf.environment.dir + "/**/*", 
                    "!" + conf.buildWorkDir, 
                    "!" + conf.buildWorkDir + "/**/*", 
                    "!" + (conf.template.dir || project.dir + "/template"),
                    "!" + (conf.template.dir || project.dir + "/template") + "/**/*",
                    "!builder.js", 
                    "!tsconfig.json", 
                    "!tests.webpack.js"])
                    .pipe(gulp.dest(path.join(project.dir, "tmpPublish")));
                streamCopyNoJs.on("error", () => {
                    helper.error("Error publish : " + arguments);
                });
                stream.push(streamCopyNoJs);

            } else {
                let streamCopy = vfs.src(
                    ["**/*",
                     "!definition-ts",
                     "!definition-ts/**/*",
                     "!node_modules", 
                     "!node_modules/**/*", 
                     "!" + conf.test, 
                     "!" + conf.test + "/**/*", 
                     "!" + conf.testReportDir, 
                     "!" + conf.testReportDir + "/**/*", 
                     "!" + conf.testWorkDir, 
                     "!" + conf.testWorkDir + "/**/*", 
                     "!" + conf.testWorkDir, 
                     "!" + conf.testWorkDir + "/**/*", 
                     "!" + conf.environment.dir, 
                     "!" + conf.environment.dir + "/**/*",                      
                     "!" + conf.buildWorkDir, 
                     "!" + conf.buildWorkDir + "/**/*", 
                     "!" + (conf.template.dir || project.dir + "/template"),
                     "!" + (conf.template.dir || project.dir + "/template") + "/**/*",
                     "!builder.js", 
                     "!tsconfig.json", 
                     "!tests.webpack.js"])
                    .pipe(Utils.absolutizeModuleRequire(helper, project, this.extensions, [".js", ".ts", ".tsx", ".jsx"]))
                    .pipe(gulp.dest(path.join(project.dir, "tmpPublish")));
                streamCopy.on("error", () => {
                    helper.error("Error publish : " + arguments);
                });
                stream.push(streamCopy);
            }

            helper.stream(
                () => {
                    let args = ["publish", "--force", path.join(project.dir, "tmpPublish")];
                    if (helper.getPublishRegistry()) {
                        args = args.concat(["--registry", helper.getPublishRegistry()]);
                    }

                    return commander.toPromise({ cmd: "npm", args: args, cwd: helper.getMainProcessDir() }, true).then((data) => {
                        setTimeout(()=> {done();}, 2000)
                    }).catch((err) => {
                        helper.error(`La commande npm ${args} dans ${helper.getMainProcessDir()} est ko`);
                        done(err);
                    });

                },
                // vfs au lieu de gulp car bug sur les liens symboliques avec gulp >= 3.8.0
                ...stream
            );
        }
    }

}

module.exports = ModulePublish;
