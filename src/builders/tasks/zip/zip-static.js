const path = require("path");
const zip = require("gulp-zip");
const Task = require("../task");

class ZipStaticTask extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.zipNameSuffixe = "-static";
    }

    task(gulp, helper, conf, project) {
        const zipname = `${project.name}-${project.version}`;

        return (done) => {
            if (!helper.folderExists(conf.environment.dir)) {
                helper.info("Aucun répertoire de fichiers static trouvé :", path.join(conf.buildWorkDir, project.name, conf.static));
                return done();
            }

            return helper.stream(
                done,
                gulp
                    .src(`${path.join(conf.buildWorkDir, project.name, conf.static)}/**/*`, {
                        base: path.join(conf.buildWorkDir, project.name),
                        cwd: project.dir,
                    })
                    .pipe(zip(`${zipname + this.zipNameSuffixe}.zip`))
                    .pipe(gulp.dest(conf.buildWorkDir)),
            );
        };
    }
}

module.exports = ZipStaticTask;
