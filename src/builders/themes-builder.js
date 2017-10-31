"use strict";

var npm = require("npm");

module.exports = {
    gulpTasks: function (gulp, project, conf, helper) {
        var path = require("path");
        var fs = require("fs");
        var zip = require("gulp-zip");
        var childProcess = require("child_process");
        var _ = require("lodash");
        var uglifycss = require("uglifycss");
        var concat = require("gulp-concat");

        var defaultConf = {
            src: "src",
            themeName: "theme",
            cssSources: { src: ["src/**/*.css"], targetDir: "css", targetFilename: "theme" },
            packageSources: [ {src: "package.json", targetDir: "" }, { src: "src/**/*.*", targetDir: "" }, { src: "!src/**/*.css", targetDir: "" }],
            zipName: project.name + "-" + project.version + ".zip",
            packageDir: ""
        };

        conf = _.merge(conf, defaultConf);

        var targetDir = "target";
        var mergedDir = path.join(targetDir, "merged");
        var mergedDependenciesCssFile = "dependencies.css";
        var mergedLocalCssFile = "local.css";
        var workDir = path.join(targetDir, "package");

        function clean(done) {
            helper.removeDir(targetDir);
            done();
        }

        function mergeDependenciesCss(done) {
            var cssSelector = [
                path.join(helper.NODE_MODULES_APP, "**", "*.css"),
                "!" + path.join(helper.NODE_MODULES_APP, "**", "*-min.css")
            ];
            helper.stream(
                done,
                gulp.src(cssSelector)
                    .pipe(concat(mergedDependenciesCssFile))
                    .pipe(gulp.dest(mergedDir))
            );
        }

        function mergeLocalCss(done) {
            if (conf.cssSources.src.length === 0) {
                done();
            } else {
                helper.stream(
                    done,
                    gulp.src(conf.cssSources.src)
                        .pipe(concat(mergedLocalCssFile))
                        .pipe(gulp.dest(mergedDir))
                );
            }
        }

        function mergeAll(done) {
            helper.stream(
                done,
                gulp.src([
                    path.join(mergedDir, mergedDependenciesCssFile),
                    path.join(mergedDir, mergedLocalCssFile)
                ])
                .pipe(concat(conf.cssSources.targetFilename + ".css"))
                .pipe(gulp.dest(path.join(workDir, conf.packageDir, conf.cssSources.targetDir)))
            )
        }

        function minifyCss(done) {
            var themeMinified = uglifycss.processFiles([path.join(workDir, conf.packageDir, conf.cssSources.targetDir, conf.cssSources.targetFilename + ".css")]);
            fs.writeFileSync(path.join(workDir, conf.packageDir, conf.cssSources.targetDir, conf.cssSources.targetFilename + "-min.css"), themeMinified);
            done();
        }

        function preparePackage(done) {
            var streamsArgs = [done];
            
            conf.packageSources.forEach(function (packageSource) {
                streamsArgs.push(
                    gulp.src(packageSource.src)
                        .pipe(gulp.dest(path.join(workDir, conf.packageDir, packageSource.targetDir))));
            });
            helper.stream.apply(null, streamsArgs);
        }

        function zipPackage(done) {
            helper.stream(
                done,
                gulp.src(path.join(workDir, "**/*.*"))
                    .pipe(zip(conf.zipName))
                    .pipe(gulp.dest(targetDir))
            );
        }

        function watch(task) {
            return function(done) {
                gulp.watch(conf.cssSources.src, [task]);
                done();
            }
        }

        function serveTheme(done) {
            var serveStatic = require("serve-static");
            var serveIndex = require("serve-index");
            var express = require("express");

            var server = express();

            server.use(function (req, res, next) {
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                next();
            });

            server.use(serveIndex(workDir, {icons: true}));
            server.use(serveStatic(workDir, {index: false}));

            helper.info("Lancement du serveur de thèmes de dev dans le dossier", workDir, "avec le port 7777");
            server.listen(7777);

            done();
        }

        // main tasks
        gulp.task("css:merge-dependencies", ["dependencies:install"], mergeDependenciesCss);
        gulp.task("css:merge-local", [], mergeLocalCss);
        gulp.task("css:merge-all", ["css:merge-dependencies", "css:merge-local"], mergeAll);
        gulp.task("css:minify", ["css:merge-all"], minifyCss);
        gulp.task("css:prepare-package", ["css:minify"], preparePackage);
        gulp.task("css:package", ["css:clean", "css:prepare-package"], zipPackage);
        gulp.task("css:clean", clean);
        gulp.task("clean", clean);
        gulp.task("clean-all", ["clean", "dependencies:clean-all"]);

        // alias
        gulp.task("package", ["css:package"]);

        // special tasks for dev
        gulp.task("css:watch", ["css:clean", "css:prepare-package"], watch("css:prepare-package"));
        gulp.task("watch", ["css:watch"]);
        gulp.task("w", ["watch"]);
        gulp.task("css:serve-theme-dev", ["css:watch"], serveTheme);
        gulp.task("start", ["css:serve-theme-dev"]);

        // default
        gulp.task("default", ["package"]);
        gulp.task("default", ["package"]);
        gulp.task("publish", function(done) { helper.npmPublish(npm, targetDir + "/package", done); });
    }
};
