"use strict";

const path = require("path");
const mocha = require("gulp-mocha");
var istanbul = require("gulp-istanbul");

var Task = require("./../task");

class RunTestMocha extends Task {

    task(gulp, helper, conf, project) {
        return (done) => {

            if (helper.isSkipTests()) {
                helper.info("Exécution des tests annulée car l'option '--skipTests' a été utilisée");
                return done();
            }

            // On ajoute le répertoire de dépendances de build/test du projet courant et on le supprimera une fois les tests terminés
            var moduleResolver = require("../../../module-resolver");
            var savedCurrentModulePaths = moduleResolver.getModuleDirectories();
            helper.applyExternalModuleDirectories(moduleResolver, project);
            moduleResolver.addModuleDirectory(path.join(project.dir, helper.NODE_MODULES_TEST));
            moduleResolver.addModuleDirectory(path.join(project.dir, helper.NODE_MODULES_APP));

            // Transpileur jsx -> js pour les jsx dans les dépendances
            require("node-jsx").install({
                extension: ".jsx",
                harmony: true
            });

            
            gulp.src(conf.testSources, {
                read: true,
                base: conf.testSourcesBase
            })
            .pipe(gulp.dest(conf.testSourcesBase))
            // Exécution des tests
            .pipe(mocha(conf.mocha))
            .on("error", (err) => {
                helper.error(err);
                if(helper.getStopOnError()) {
                    proces.exit(1);
                }
            })
            .on("end", () => {
                // revert modules paths
                moduleResolver.setModuleDirectories(savedCurrentModulePaths);
                // au cas où un test défini la variable document permet d'éviter que le chargement de 'sinon' échoue
                delete global.document;
                if(!helper.getStopOnError()) {
                    done();
                }
            })
            // Ecriture des rapports de couverture de code
            .pipe(istanbul.writeReports(conf.istanbul));
        }
    }
}


module.exports = RunTestMocha;
