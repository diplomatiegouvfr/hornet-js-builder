"use strict";

const Task = require("./../task");
const path = require("path");
const fs = require("fs");
const header = require("gulp-header");

class LicenseHeader extends Task {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
        if(helper.fileExists(path.join(project.dir, "files-header.txt"))) {
            this.headerFile = path.join(project.dir, "files-header.txt");
        } else {
            this.headerFile = path.join(__dirname, "files-header-cecill-license.txt");
        }
    }

    task(gulp, helper, conf, project) {
        return (done) => {
           
            if (project.type === helper.TYPE.CUSTOM) {
                return done();
            }

            var listFiles = ["!**/*.ttf",
                "!**/*.png",
                "!**/*.gif",
                "!**/*.svg",
                "!**/*.md",
                "!**/*.json"];

            listFiles.push(path.join("./builder.js"));
            listFiles.push(path.join("./index.ts"));
            listFiles.push(path.join("./index.dts"));

            if (conf.src) {
                listFiles.push(path.join(".", conf.src, "/**/*.ts"));
                listFiles.push(path.join(".", conf.src, "/**/*.tsx"));
            }
            if (conf.test) {
                listFiles.push(path.join(".", conf.test, "/**/*.ts"));
                listFiles.push(path.join(".", conf.test, "/**/*.tsx"));
            }
            if (conf.cssSources && conf.cssSources.src) {
                conf.cssSources.src.forEach((src)=>{
                    listFiles.push(path.join(src, "/**/*"));
                });
            }

            gulp.src(listFiles, {base: './'})
                .pipe(header(fs.readFileSync(path.join(__dirname, "header-cecill-license.txt"), "utf8"), {pkg: project.packageJson}))
                .pipe(gulp.dest("./"));
            done();
        }
    }
}

module.exports = LicenseHeader;