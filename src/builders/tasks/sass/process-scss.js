"use strict";

const concat = require("gulp-concat");
const Task = require("../task");

class ProcessScss extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, watchMode, watchTasks) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
        this.watchMode = watchMode;
        this.watchTasks = watchTasks;
    }

    task(gulp, helper, conf, project) {
        return (done) => {

            if (this.watchMode) {

                gulp.watch(conf.sassConfiguration.sass.inputFilter, this.watchTasks)
                .on("change", (event) => {
                    helper.debug("Fichier ", event.path, "a été", event.type);
                });
                done();
            } else {
                this.sassProcess(gulp, helper, conf, done);
            }
        }
    }

    /**
     * Méthode de génération des fichiers css depuis des scss
     */
    sassProcess(gulp, helper, conf, done) {

        if (!Array.isArray(conf.sassConfiguration.sass.inputFilter)) {
            conf.sassConfiguration.sass.inputFilter = [conf.sassConfiguration.sass.inputFilter];   
        }
        conf.sassConfiguration.sass.inputFilter.splice(0, -1, conf.sassConfiguration.img.output.dir + "_sass-image.scss");
        let sass;
        try {
            sass = require("gulp-sass");

        } catch (e) {
            helper.error(e);
            done();
        }
        let sassPipe = gulp.src(conf.sassConfiguration.sass.inputFilter)
        .pipe(sass(conf.sassConfiguration.sass.options).on('error', sass.logError));

        if(conf.sassConfiguration.sass.merge) {
            sassPipe = sassPipe.pipe(concat(conf.sassConfiguration.sass.output.fileName));
        }

        return helper.stream(
            done,
            sassPipe
            .pipe(gulp.dest(conf.sassConfiguration.sass.output.dir))
        );
    }
}


module.exports = ProcessScss;