"use strict";

const path = require("path");
const zip = require("gulp-zip");
const State = require("./../../state");
const fs = require('fs-extra');
const npm = require("npm");
const Task = require("./../task");

class ZipTask extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.zipname = project.name + "-" + project.version;
        this.fileList = [];

    }

    task(gulp, helper, conf, project) {
        return (cb) => {

            var staticPath = path.join("./" + conf.static + "/**/*");
            var fileList = [];
            var fileListMap = [];
            var fileListSources = [];
            var zipnameinit = project.name + "-" + project.version;
            var zipname = "";
            if (this.isStatic) {
                fileList.push(staticPath);
                zipname = zipnameinit + "-static";
            } else {
                fileList.push(path.join("./index.*"));
                fileList.push(path.join(conf.src, "/**/*"));
                fileList.push(staticPath);
                fileList.push(path.join("./", helper.NODE_MODULES_APP + "/**/*"));
                fileList.push(path.join(conf.config + "/**/*"));
                fileList.push(path.join("./package.json"));
                zipname = zipnameinit + "-dynamic";
            }

            fileList.push("!**/*.map");
            if (this.isStatic) {
                var staticMapPath = path.join("./" + conf.static + "/js/*.map");

                fileListMap.push(staticMapPath);

                gulp.src(fileListMap, {base: "./" + conf.static + "/js"})
                    .pipe(zip(zipname + "-map.zip"))
                    .pipe(gulp.dest("./target/"));
            } else {
                // map de la partie dynamique
                fileListMap = fileList.slice(0);
                fileListMap.push("**/*.map");
                fileListMap.push("!./" + conf.static);
                //On recupere les externals modules
                var root = project.packageJson;
                var dep = helper.getExternalModuleDirectories(project);

                /*for ( const nameDir of dep ) {
                    fs.copy(nameDir, helper.NODE_MODULES_APP, function (err) {
                        if (err) return console.error("Erreur pour: "+dep+" ERROR: "+ err)
                        console.log("Copie OK pour: "+ nameDir);
                    })
                };*/

                //sources du projet
                fileListSources = fileList.slice(0);
                fileListSources.push("./*.*");
                fileListSources.push("!" + conf.src + "/**/*.js");
                fileListSources.push("!**/*.map");
                fileListSources.push("!./index.js");

                gulp.src(fileListSources, {base: "."})
                    .pipe(zip(zipnameinit + "-sources.zip"))
                    .pipe(gulp.dest("./target/"));


            }

            fileList.push("!**/*.ts");

            helper.debug("Zip fileList:", fileList);

            // once preprocess ended, concat result into a real file

            return helper.stream(
                cb,
                gulp.src(fileList, {base: "."})
                    .pipe(zip(zipname + ".zip"))
                    .pipe(gulp.dest("./target/"))
            );
        }
    }
}


module.exports = ZipTask;
