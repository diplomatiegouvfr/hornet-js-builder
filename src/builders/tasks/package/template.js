const path = require("path");
const ejs = require("gulp-ejs");
const rename = require("gulp-rename");
const merge = require("lodash.merge");
const Task = require("../task");

class Template extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.launchDir = conf.template.dir || `${project.dir}/template`;
        this.targetDir = path.join(project.dir, conf.tscOutDir || "", conf.static, conf.templateDir);
        this.templateContext = { project: { name: project.name, version: project.version, static: `static-${project.version}/` } };
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            // maj pour nightly
            delete require.cache[require.resolve(project.packageJsonPath)];
            const tmpPackage = require(project.packageJsonPath);
            this.templateContext.project.version = tmpPackage.version;
            this.templateContext.project.static = `static-${project.version}/`;

            const streams = [];

            if (Array.isArray(conf.template)) {
                conf.template.forEach((templateConf, index) => {
                    if (Array.isArray(conf.template[index].context)) {
                        conf.template[index].context.forEach((templateContext, indexContext) => {
                            conf.template[index].context[indexContext] = merge(conf.template[index].context[indexContext], this.templateContext);
                            streams.push(
                                gulp
                                    .src(`${conf.template[index].dir || this.launchDir}/*.html`)
                                    .pipe(ejs(conf.template[index].context[indexContext]))
                                    .pipe(rename({ extname: `${conf.template[index].context[indexContext].suffixe}.html` }))
                                    .pipe(gulp.dest(this.targetDir + (conf.template[index].dest || ""))),
                            );
                        });
                    } else {
                        conf.template[index].context = merge(conf.template[index].context, this.templateContext);
                        streams.push(
                            gulp
                                .src(`${conf.template[index].dir || this.launchDir}/*.html`)
                                .pipe(ejs(conf.template[index].context))
                                .pipe(gulp.dest(this.targetDir + (conf.template[index].dest || ""))),
                        );
                    }
                });
            } else {
                this.templateContext = merge(conf.template.context, this.templateContext);
                streams.push(
                    gulp
                        .src(`${this.launchDir}/**/*.html`)
                        .pipe(ejs(this.templateContext))
                        .pipe(gulp.dest(this.targetDir + (conf.template.dest || ""))),
                );
            }

            helper.debug("Template context :", this.templateContext);

            helper.stream(done, streams);
        };
    }
}

module.exports = Template;
