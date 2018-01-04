"use strict";

const Task = require("../task");
//const ejs = require("ejs");
const ejs = require("gulp-ejs")
const _ = require("lodash");
const path = require("path");

class Template extends Task {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);


        this.launchDir = conf.template.dir || project.dir + "/template";
        this.targetDir = path.join(project.dir,conf.static, conf.templateDir) ;
        this.templateContext = {project: { name: project.name, version: project.version, static: "static-" + project.version + "/"}};
        
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            
            // maj pour nightly
            delete require.cache[require.resolve(project.packageJsonPath)];
            let tmpPackage = require(project.packageJsonPath)
            this.templateContext.project.version = tmpPackage.version;
            this.templateContext.project.static = "static-" + project.version + "/";

            

            let streams = [];

            if (_.isArray(conf.template)) {
                conf.template.forEach((templateConf, index) => {
                    if (_.isArray(conf.template[index].context)) {
                        conf.template[index].context.forEach((templateContext, indexContext) => {
                            conf.template[index].context[indexContext] = _.merge(conf.template[index].context[indexContext], this.templateContext);
                            streams.push(gulp.src((conf.template[index].dir || this.launchDir) + "/*.html")
                                .pipe(ejs(conf.template[index].context[indexContext], {}, {ext: conf.template[index].context[indexContext].suffixe+".html" }))
                                .pipe(gulp.dest(this.targetDir + (conf.template[index].dest || "")))
                            );
                        });
                    } else {
                        conf.template[index].context = _.merge(conf.template[index].context, this.templateContext);
                        streams.push(gulp.src((conf.template[index].dir || this.launchDir) + "/*.html")
                            .pipe(ejs(conf.template[index].context))
                            .pipe(gulp.dest(this.targetDir + (conf.template[index].dest || "")))
                        );
                    }
                });

            } else {
                this.templateContext = _.merge(conf.template.context, this.templateContext);
                streams.push(gulp.src(this.launchDir + "/**/*.html")
                    .pipe(ejs(this.templateContext))
                    .pipe(gulp.dest(this.targetDir + (conf.template.dest || "")))
                );
            }




            helper.debug("Template context :", this.templateContext);

            helper.stream(done, streams);
        }
    }
}

module.exports = Template;