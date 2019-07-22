"use strict";

const path = require("path");
const through = require("through2");
const PluginError = require("plugin-error");
const _ = require("lodash");

const Task = require("./../task");
const Utils = require("../utils");

class PrepareTestSources extends Task {

    task(gulp, helper, conf, project) {
        return (done) => {

            if (helper.isSkipTests()) {
                helper.info("Exécution des tests annulée car l'option '--skipTests' a été utilisée");
                return done();
            }

            let tscOutDir = project.tsConfig.compilerOptions || {};
            tscOutDir = tscOutDir.outDir || undefined;
            let base = tscOutDir ? path.resolve("/", tscOutDir).substring(1) : "." + path.sep;

            // on copie toutes les sources js vers le répertoire istanbul
            // on transpile tous les jsx en js
            // les require sont remplacés pour revenir en url relative pour la couverture de code
            // puis on supprime tous les jsx pour éviter de lancer 2 fois les mêmes tests
            helper.stream(
                () => {
                    Utils.gulpDelete(helper, path.join(conf.testWorkDir, "**/*.jsx"))(done)
                },
                gulp.src(conf.allSources, {base})
                    .pipe(relativizeModuleRequire(helper, project))
                    .pipe(gulp.dest(conf.testWorkDir)),
            );
        }
    }


}

function relativizeModuleRequire(helper, project) {
    // require('src/aaa/bbb') > require('../aaa/bbb')
    var regexRequire = /(require|proxyquire)\(["']((src|test)\/[^"']*)["']/;

    let tscOutDir = project.tsConfig.compilerOptions || {};
    tscOutDir = tscOutDir.outDir || undefined;
    var dest = tscOutDir ? path.resolve(project.dir, tscOutDir) : project.dir;

    return through.obj(function (file, enc, cb) {
        if (file.isNull()) {
            cb(null, file);
            return;
        }

        if (file.isStream()) {
            cb(new PluginError("relativizeModuleRequire", "Streaming not supported"));
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
                    var isJs = false;
                    if (isJs = helper.fileExists(path.join(dest, required + ".js")) || helper.fileExists(path.join(dest, required + ".jsx"))) {
                        var sr = required;
                        required = "./" + path.relative(fileDir, path.join(dest, required + (isJs ? ".js" : ".jsx"))).replace(/\.[^.$]+$/, "").replace(/\\/g, "/");
                        processedLine = line.replace(regexRequire, (line.indexOf("proxyquire") == -1 ? "require" : "proxyquire") + "(\"" + required + "\"");
                    }
                }
                return processedLine;
            });

            file.contents = Buffer.from(lines.join("\n"));
            this.push(file);
        } catch (err) {
            this.emit("error", new PluginError("relativizeModuleRequire", err, {
                fileName: file.path
            }));
        }

        cb();
    });
}

module.exports = PrepareTestSources;
