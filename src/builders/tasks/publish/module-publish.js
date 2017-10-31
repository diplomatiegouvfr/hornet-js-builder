"use strict";

const Task = require("./../task");
const Utils = require("../utils");
const npm = require("npm");
const vfs = require("vinyl-fs");
const path = require("path");
const fs = require("fs");

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
    let stream = vfs.src(["**/*", "definition-ts/**/*", "!node_modules/**/*", "!istanbul/**/*", "!node_modules", "!istanbul"])
                    .pipe(Utils.absolutizeModuleRequire(helper, project, this.extensions, [".js", ".ts", ".tsx", ".jsx"]))
                    .pipe(gulp.dest(path.join(project.dir, "tmpPublish")))
            stream.on("error", () => {
                helper.error("Error publish : " + arguments);
            });
            
            helper.stream(
                () => {
                    helper.npmPublish(npm, path.join(project.dir, "tmpPublish"), (err) => {
                        helper.removeDir(path.join(project.dir, "tmpPublish"));
                        done(err);
                    });
                },
                // vfs au lieu de gulp car bug sur les liens symboliques avec gulp >= 3.8.0
                stream
            );
        }
    }
}

module.exports = ModulePublish;
