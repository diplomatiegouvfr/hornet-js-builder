const path = require("path");
const zip = require("gulp-zip");
const Task = require("../task");

class ZipTask extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.zipname = `${project.name}-${project.version}`;
        this.fileList = [];
    }

    task(gulp, helper, conf, project) {
        return (cb) => {
            const staticPath = path.join(project.dir, conf.static, "**", "*");
            const fileList = [];
            let fileListMap = [];
            let fileListSources = [];
            const zipnameinit = `${project.name}-${project.version}`;
            let zipname = "";
            if (this.isStatic) {
                fileList.push(staticPath);
                zipname = `${zipnameinit}-static`;
            } else {
                fileList.push(path.join("./index.*"));
                fileList.push(path.join(conf.src, "/**/*"));
                fileList.push(staticPath);
                fileList.push(path.join("./", `${helper.NODE_MODULES}/**/*`));
                fileList.push(path.join(`${conf.config}/**/*`));
                fileList.push(path.join("./package.json"));
                zipname = `${zipnameinit}-dynamic`;
            }

            fileList.push("!**/*.map");
            if (this.isStatic) {
                const staticMapPath = path.join(projct.dir, conf.static, "js", "/*.map");

                fileListMap.push(staticMapPath);

                gulp.src(fileListMap, { base: path.join(project.dir, conf.static, "js"), cwd: project.dir })
                    .pipe(zip(`${zipname}-map.zip`))
                    .pipe(gulp.dest(path.join(".", conf.buildWorkDir)));
            } else {
                // map de la partie dynamique
                fileListMap = fileList.slice(0);
                fileListMap.push("**/*.map");
                fileListMap.push(`!./${conf.static}`);

                // sources du projet
                fileListSources = fileList.slice(0);
                fileListSources.push("./*.*");
                fileListSources.push(`!${conf.src}/**/*.js`);
                fileListSources.push("!**/*.map");
                fileListSources.push("!./index.js");

                gulp.src(fileListSources, { base: project.dir, cwd: project.dir })
                    .pipe(zip(`${zipnameinit}-sources.zip`))
                    .pipe(gulp.dest(path.join(".", conf.buildWorkDir)));
            }

            fileList.push("!**/*.ts");

            helper.debug("Zip fileList:", fileList);

            // once preprocess ended, concat result into a real file

            return helper.stream(
                cb,
                gulp
                    .src(fileList, { base: project.dir, cwd: project.dir })
                    .pipe(zip(`${zipname}.zip`))
                    .pipe(gulp.dest(path.join(".", conf.buildWorkDir))),
            );
        };
    }
}

module.exports = ZipTask;
