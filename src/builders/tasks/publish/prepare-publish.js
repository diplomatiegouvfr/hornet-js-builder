const path = require("path");
const vfs = require("vinyl-fs");
const Task = require("../task");
const Utils = require("../utils");

/**
 * Fonction générique de recopie de fichiers vers le repertoire de destination
 */
class PreparePublish extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.extensions = [".js", ".tsx", ".json", ".jsx"];
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            const stream = [];

            const streamCopyJs = vfs
                .src(conf.prepare.publish.filesToCopy, { base: conf.target.ts, cwd: project.dir, dot: true, allowEmpty: true })
                .pipe(Utils.absolutizeModuleRequire(helper, project, this.extensions, [".js", ".jsx"]))
                .pipe(gulp.dest(conf.prepare.publish.outDir));

            streamCopyJs.on("error", () => {
                helper.error(`Error prepare publish Js`);
            });
            stream.push(streamCopyJs);
            const streamCopyNoJs = vfs.src(conf.prepare.publish.othersFilesToCopy, { base: project.dir, cwd: project.dir, dot: true, allowEmpty: true }).pipe(gulp.dest(conf.prepare.publish.outDir));
            streamCopyNoJs.on("error", () => {
                helper.error(`Error prepare publish No Js`);
            });
            stream.push(streamCopyNoJs);

            helper.stream(
                () => {
                    done();
                },
                // vfs au lieu de gulp car bug sur les liens symboliques avec gulp >= 3.8.0
                ...stream,
            );
        };
    }
}

module.exports = PreparePublish;
