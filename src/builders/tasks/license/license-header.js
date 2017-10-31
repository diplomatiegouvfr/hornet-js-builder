"use strict";

const Task = require("./../task");
const path = require("path");
const fs = require("fs");
const header = require("gulp-header");

class LicenseHeader extends Task {

    task(gulp, helper, conf, project) {
        return (done) => {
           
            if (project.type === helper.TYPE.CUSTOM) {
                return done();
            }

            var listFiles = ["!**/*.ttf",
                "!**/*.png",
                "!**/*.gif",
                "!**/*.svg",
                "!**/*.md"];

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