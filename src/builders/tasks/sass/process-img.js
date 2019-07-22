"use strict";

const Task = require("../task");
const rename = require("gulp-rename");

class ProcessImg extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, watchMode, watchTasks) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
        this.watchMode = watchMode;
        this.watchTasks = watchTasks;
    }

    task(gulp, helper, conf, project) {
        return (done) => {


            if (this.watchMode) {

                gulp.watch(conf.sassConfiguration.sass.inputFilter, this.watchTasks)
                    .on("change", function (event) {
                        helper.debug("Fichier ", event.path, "a été", event.type);
                    });
                done();
            } else {
                var myPromise = new Promise((resolve, reject) => { resolve(); });
                myPromise.then((result) => {
                    this.copyImgToStatic(gulp, helper, conf)
                }).then((result) => {
                    this.imageProcess(gulp, helper, conf, done);
                })

            }
        }
    }

    /**
     * Méthode de génération des fichiers css depuis des scss
     */
    imageProcess(gulp, helper, conf, done) {
        let sassImage;
        try {
            sassImage = require("gulp-sass-image");
        } catch (e) {
            console.error(e);
            done();
        }
        const templatePath = conf.sassConfiguration.img.template;
        let imgPipe = gulp.src(conf.sassConfiguration.img.inputFilter)
            .pipe(sassImage({
                css_path: conf.sassConfiguration.sass.output.dir,
                http_images_path: conf.sassConfiguration.img.output.dir,
                template: templatePath
            })).pipe(gulp.dest(conf.sassConfiguration.sass.output.dir))


        return helper.stream(
            done,
            imgPipe
        );
    }

    copyImgToStatic(gulp, helper, conf) {
        return gulp.src(conf.sassConfiguration.img.inputFilter)
            .pipe(rename({ dirname: "" }))
            .pipe(gulp.dest(function (file) {
                return conf.sassConfiguration.img.output.dir;
            }));
    }
}


module.exports = ProcessImg;