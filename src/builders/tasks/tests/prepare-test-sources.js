const path = require("path");
const map = require("lodash.map");
const PluginError = require("plugin-error");
const through = require("through2");
const Task = require("../task");
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
            const base = tscOutDir ? path.resolve(project.dir, tscOutDir) : `.${path.sep}`;

            // on copie toutes les sources js vers le répertoire istanbul
            // on transpile tous les jsx en js
            // les require sont remplacés pour revenir en url relative pour la couverture de code
            // puis on supprime tous les jsx pour éviter de lancer 2 fois les mêmes tests
            helper.stream(
                () => {
                    Utils.gulpDelete(helper, path.join(conf.testWorkDir, "**/*.jsx"), project.dir)(done);
                },
                gulp
                    .src(conf.allSources, { base, allowEmpty: true, cwd: project.dir })
                    .pipe(relativizeModuleRequire(helper, project))
                    .pipe(gulp.dest(path.join(project.dir, conf.testWorkDir))),
                gulp.src(conf.allOtherResources, { base, allowEmpty: true, cwd: project.dir }).pipe(gulp.dest(path.join(project.dir, conf.testWorkDir))),
            );
        };
    }
}

function relativizeModuleRequire(helper, project) {
    // require('src/aaa/bbb') > require('../aaa/bbb')
    const regexRequire = /(require|proxyquire)\(["']((src|test)\/[^"']*)["']/;

    let tscOutDir = project.tsConfig.compilerOptions || {};
    tscOutDir = tscOutDir.outDir || undefined;
    const dest = tscOutDir ? path.resolve(project.dir, tscOutDir) : project.dir;

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
            const content = file.contents
                .toString()
                .replace(/declare /g, "")
                .replace(/\r\n/g, "\n");
            let lines = content.split("\n");

            // remplacement des require("src/...") par require("../...")
            lines = map(lines, (line) => {
                let processedLine = line;
                const matches = regexRequire.exec(line);

                if (matches) {
                    let required = matches[2];
                    const fileDir = path.dirname(file.path);
                    const isJs = helper.fileExists(path.join(dest, `${required}.js`)) || helper.fileExists(path.join(dest, `${required}.jsx`));
                    const isIndex = helper.fileExists(path.join(dest, `${required}/index.js`));
                    const isJsx = helper.fileExists(path.join(dest, `${required}.jsx`));
                    if (isJs || isIndex) {
                        required = `./${path
                            .relative(fileDir, path.join(dest, required + (isIndex ? "/index" : "") + ((isJs || isIndex) && !isJsx ? ".js" : ".jsx")))
                            .replace(/\.[^.$]+$/, "")
                            .replace(/\\/g, "/")}`;
                        processedLine = line.replace(regexRequire, `${line.indexOf("proxyquire") === -1 ? "require" : "proxyquire"}("${required}"`);
                    }
                }
                return processedLine;
            });

            file.contents = Buffer.from(lines.join("\n"));
            this.push(file);
        } catch (err) {
            this.emit(
                "error",
                new PluginError("relativizeModuleRequire", err, {
                    fileName: file.path,
                }),
            );
        }

        cb();
    });
}

module.exports = PrepareTestSources;
