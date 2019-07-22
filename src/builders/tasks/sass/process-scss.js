"use strict";

const postcss = require('gulp-postcss');
const autoprefixer = require("autoprefixer");
const Task = require("../task");
const header = require("gulp-header");
const path = require("path");

class ProcessScss extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, watchMode, watchTasks) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
        this.watchMode = watchMode;
        this.watchTasks = watchTasks;
        
        // Possibilité de surcharger la configuration globale par le projet
        let env = (process.env.NODE_ENV || "").toLowerCase();
        if (helper.fileExists(path.join(project.dir, "sass.config." + env +".js"))) {
            this.sassConfigFile = path.join(project.dir, "sass.config." + env +".js");
        } else if(helper.fileExists(path.join(project.dir, "sass.config.js"))) {
            this.sassConfigFile = path.join(project.dir, "sass.config.js");
        } else {
            this.sassConfigFile = undefined;
        }

        this.configuration = {
            merge: true,
            inputFilter: "./src/**/*.scss",
            options: {
                outputStyle: process.env.NODE_ENV !== "production" ? "expanded": "compressed",
                data: ""
            },
            output: {
                dir: path.join(conf.static, "css"),
                fileName: process.env.NODE_ENV !== "production" ? "appli.css": "appli.min.css"
            },
            //img: {
            //    inputFilter: "./img/**/*.+(jpeg|jpg|png|gif|svg|ttf)",
            //    output: {
            //        dir: path.join(staticDir, "img")
            //    },
            //    template: path.join(__dirname, "..", "builders", "tasks", "sass", "sass-image-template.mustache")
            //}
        };

        if (this.sassConfigFile) {
            this.configuration = require(this.karmaConfigFile)(project, conf, helper, this.configuration);
        } else {
            this.configuration = undefined;
        }
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            if (!this.sassConfigFile) {
                helper.info("Exécution processing sass annulé car aucun fichier de configuration trouvé.");
            }

            if (this.watchMode) {
                gulp.watch(this.configuration.inputFilter, this.watchTasks)
                    .on("change", (event) => {
                        helper.debug("Fichier ", event.path, "a été", event.type);
                    });
                done();
            } else {
                this.sassProcess(gulp, helper, conf, project,  done);
            }
        }
    }

    /**
     * Méthode de génération des fichiers css depuis des scss
     */
    sassProcess(gulp, helper, conf, project, done) {
        //inputFilters
        if (!Array.isArray(this.configuration.inputFilter)) {
            this.configuration.inputFilter = [this.configuration.inputFilter];
        }

        let sass;

        try {
            sass = require("gulp-sass");
        } catch (e) {
            helper.error(e);
            done();
        }

        // Génération des variables sass pour le path des ressources
        let data = '$PATH_FONT: "' + project.staticPath + 'theme/fonts/"; $PATH_IMG: "' + project.staticPath + 'theme/img/";';

        // Injection des variables via header
        let sassPipe = gulp.src(this.configuration.inputFilter)
            .pipe(header(data))
            .pipe(sass(this.configuration.options).on('error', sass.logError));

        // output
        return helper.stream(
            done,
            sassPipe
                .pipe(postcss([autoprefixer({ browsers: "last 2 versions" })]))
                .pipe(gulp.dest(this.configuration.output.dir))
        );
    }
}

module.exports = ProcessScss;
