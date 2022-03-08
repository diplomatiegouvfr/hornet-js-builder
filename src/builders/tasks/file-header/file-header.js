const fs = require("fs");
const path = require("path");
const header = require("gulp-header");
const Task = require("../task");

class FileHeader extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
        if (helper.fileExists(path.join(project.dir, "file-header.txt"))) {
            this.headerFile = fs.readFileSync(path.join(project.dir, "file-header.txt"), "utf8");
        } else {
            this.headerFile = fs.readFileSync(path.join(__dirname, "file-header.txt"), "utf8");
        }
        if (helper.fileExists(path.join(project.dir, "file-header-license.txt"))) {
            this.licenceFile = fs.readFileSync(path.join(project.dir, "file-header-license.txt"), "utf8");
        } else {
            this.licenceFile = fs.readFileSync(path.join(__dirname, "file-header-license.txt"), "utf8");
        }
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            if (project.type === helper.TYPE.CUSTOM) {
                return done();
            }

            const listFiles = ["!**/*.ttf", "!**/*.png", "!**/*.gif", "!**/*.svg", "!**/*.md", "!**/*.json"];

            listFiles.push(path.join("./builder.js"));
            listFiles.push(path.join("./.builder.js"));
            listFiles.push(path.join("./index.ts"));
            listFiles.push(path.join("./index.dts"));

            const dirs = [];
            if (conf.src) dirs.push(conf.src);
            if (conf.test) dirs.push(conf.test);
            if (conf.header && conf.header.otherDirs) dirs.push(conf.header.otherDirs);

            dirs.forEach((dir) => {
                listFiles.push(path.join(".", dir, "/**/*.ts"));
                listFiles.push(path.join(".", dir, "/**/*.tsx"));
                listFiles.push(path.join(".", dir, "/**/*.scss"));
                listFiles.push(path.join(".", dir, "/**/*.js"));
                listFiles.push(path.join(".", dir, "/**/*.jsx"));
                if (conf.header && conf.header.otherExts) {
                    if (Array.isArray(conf.header.otherExts)) {
                        conf.header.otherExts.forEach((ext) => {
                            listFiles.push(path.join(".", dir, `**/${ext}`));
                        });
                    } else {
                        listFiles.push(path.join(".", dir, `**/${conf.header.otherExts}`));
                    }
                }
            });

            return helper.stream(
                done,
                gulp
                    .src(listFiles, { base: project.dir, cwd: project.dir })
                    .pipe(header(`${this.licenceFile}\n${this.headerFile}\n`, { pkg: project.packageJson }))
                    .pipe(gulp.dest(project.dir)),
            );
        };
    }
}

module.exports = FileHeader;
