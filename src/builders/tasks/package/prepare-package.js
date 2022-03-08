const path = require("path");
const Prepare = require("./prepare");

class PreparePackage extends Prepare {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.fileList = [
            path.join(`./${conf.static}/**/*`),
            "!**/*.map",
            path.join("./index.*"),
            path.join("./", `${helper.NODE_MODULES}/**/*.*`),
            path.join(`${conf.config}/**/*`),
            path.join("./package.json"),
            path.join("./package-lock.json"),
            "!**/*.ts",
            "!**/*.tsx",
        ];
        this.fileListTarget = [path.join(conf.target.src, "/**/*"), path.join(conf.tscOutDir || "", "./index.*"), "!**/*.map", "!**/*.ts", "!**/*.tsx"];
        if (conf.ressources && Array.isArray(conf.ressources)) {
            Array.prototype.push.apply(this.fileList, conf.ressources);
        }
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            helper.stream(
                done,
                gulp.src(this.fileList, { base: project.dir, cwd: project.dir }).pipe(gulp.dest(this.targetDir)),
                gulp.src(this.fileListTarget, { base: conf.tscOutDir || project.dir, cwd: project.dir }).pipe(gulp.dest(this.targetDir)),
            );
        };
    }
}

module.exports = PreparePackage;
