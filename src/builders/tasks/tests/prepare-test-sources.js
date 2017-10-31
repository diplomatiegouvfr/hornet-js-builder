"use strict";

const istanbul = require("gulp-istanbul");
const path = require("path");
const through = require("through2");
const react = require("gulp-react");
const gutil = require("gulp-util");
const _ = require("lodash");
const del = require("del");

const Task = require("./../task");
const Utils = require("../utils");

class PrepareTestSources extends Task {

    task(gulp, helper, conf, project) {
        return (done) => {

            if (helper.isSkipTests()) {
                helper.info("Exécution des tests annulée car l'option '--skipTests' a été utilisée");
                return done();
            }

            // on copie toutes les sources js vers le répertoire istanbul
            // on transpile tous les jsx en js
            // les require sont remplacés pour revenir en url relative pour la couverture de code
            // puis on supprime tous les jsx pour éviter de lancer 2 fois les mêmes tests
            helper.stream(
                () => {
                    Utils.gulpDelete(helper, path.join(conf.testWorkDir, "**/*.jsx"))(done)
                },
                gulp.src(conf.allSources, {base: "." + path.sep})
                    .pipe(relativizeModuleRequire(helper, project))
                    .pipe(gulp.dest(conf.testWorkDir)),

                gulp.src(["**/*.jsx"])
                    .pipe(react({harmony: true}))
                    .pipe(relativizeModuleRequire(helper, project))
                    .pipe(gulp.dest(conf.testWorkDir))
            );
        }
    }


}

function relativizeModuleRequire(helper, project) {
    // require('src/aaa/bbb') > require('../aaa/bbb')
    var regexRequire = /(require|proxyquire)\(["']((src|test)\/[^"']*)["']/;

    return through.obj(function (file, enc, cb) {
        if (file.isNull()) {
            cb(null, file);
            return;
        }

        if (file.isStream()) {
            cb(new gutil.PluginError("relativizeModuleRequire", "Streaming not supported"));
            return;
        }

        try {
            var content = file.contents.toString().replace(/declare /g, "").replace(/\r\n/g, "\n"),
                lines = content.split("\n");

            // remplacement des require("src/...") par require("../...")
            lines = _.map(lines, function (line) {
                var processedLine = line,
                    matches = regexRequire.exec(line);

                if (matches) {
                    var required = matches[2];
                    var fileDir = path.dirname(file.path);
                    //console.log("file.path=",file.path, " required=", required, " fileDir=", fileDir);
                    var isJs = false;
                    if (isJs = helper.fileExists(path.join(project.dir, required + ".js")) || helper.fileExists(path.join(project.dir, required + ".jsx"))) {
                        var sr = required;
                        required = "./" + path.relative(fileDir, path.join(project.dir, required + (isJs ? ".js" : ".jsx"))).replace(/\.[^.$]+$/, "").replace(/\\/g, "/");
                        //console.log("file = " , fileDir, ", require1 = ", sr, ", require2 = ", required)
                        processedLine = line.replace(regexRequire, (line.indexOf("proxyquire") == -1 ? "require" : "proxyquire") + "(\"" + required + "\"");
                    }
                }
                return processedLine;
            });

            file.contents = new Buffer(lines.join("\n"));
            this.push(file);
        } catch (err) {
            this.emit("error", new gutil.PluginError("relativizeModuleRequire", err, {
                fileName: file.path
            }));
        }

        cb();
    });
}

module.exports = PrepareTestSources;
