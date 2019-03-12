"use strict";

const concat = require("gulp-concat");
const Task = require("../task");

class ProcessSass extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, watchMode, watchTasks) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
        this.watchMode = watchMode;
        this.watchTasks = watchTasks;
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            const sass = require("gulp-sass");
            if (this.watchMode) {
                gulp.watch(conf.sass.inputFilter, this.watchTasks)
                .on("change", function (event) {
                    helper.debug("Fichier ", event.path, "a été", event.type);
                });
                done();
            } else {
                
                let sassPipe = gulp.src(conf.sass.inputFilter)
                .pipe(sass(conf.sass.options).on('error', sass.logError));

                if(conf.sass.merge) {
                    sassPipe = sassPipe.pipe(concat(conf.sass.output.fileName));
                }

                return helper.stream(
                    done,
                    sassPipe
                    .pipe(gulp.dest(conf.sass.output.dir))
                );
            }
        }
    }
}


module.exports = ProcessSass;