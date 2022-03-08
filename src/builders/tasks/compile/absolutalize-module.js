const path = require("path");
const Task = require("../task");
const Utils = require("../utils");

/**
 * Fonction générique de recopie de fichiers vers le repertoire de destination
 */
class AbsolutizeModule extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.extensions = [".js", ".json", ".jsx"];
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            if (project.type !== helper.TYPE.MODULE && project.type !== helper.TYPE.COMPOSANT) {
                return done();
            }

            return helper.stream(
                done,
                gulp
                    .src(
                        [`${path.join(project.dir, conf.target.ts)}/**/*.js`, `${path.join(project.dir, conf.target.ts)}/**/*.d.ts`, "!**/node_modules/**/*"],
                        { base: path.join(project.dir, conf.target.ts), cwd: project.dir },
                    )
                    .pipe(Utils.absolutizeModuleRequire(helper, project, this.extensions))
                    .pipe(gulp.dest(path.join(project.dir, conf.target.ts))),
            );
        };
    }
}

module.exports = AbsolutizeModule;
