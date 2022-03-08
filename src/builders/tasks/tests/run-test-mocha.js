const path = require("path");
const dargs = require("dargs");
const through2 = require("through2");
const Task = require("../task");

class RunTestMocha extends Task {
    task(gulp, helper, conf, project) {
        return (done) => {
            const mocha = require("../../../gulp/mocha"); // Mocha > 8.1 non compatible node8

            let hasTestFile = false;
            if (helper.isSkipTests()) {
                helper.info("Exécution des tests mocha annulée car l'option '--skipTests' a été utilisée");
                return done();
            }

            // Transpileur jsx -> js pour les jsx dans les dépendances
            require("node-jsx").install({
                extension: ".jsx",
                harmony: true,
            });
            return helper.stream(
                done,
                gulp
                    .src(helper.getFile() ? path.join(conf.testWorkDir, helper.getFile().replace(/\.tsx?$/, ".js")) : conf.testSources, {
                        read: true,
                        base: conf.testSourcesBase,
                        cwd: project.dir,
                    })
                    // Exécution des tests si fichiers sinon mocha plante
                    .pipe(
                        through2.obj(
                            function (chunk, encoding, callback) {
                                hasTestFile = true;
                                this.push(chunk);
                                callback();
                            },
                            function (cb) {
                                !hasTestFile ? helper.info("Aucun test mocha trouvé") & done() : cb();
                            },
                        ),
                    )
                    .pipe(mocha(dargs(conf.mocha), conf.mocha.extendsOpts, conf.istanbul, project))
                    .on("error", (err) => {
                        helper.error(err);
                        if (helper.getStopOnError()) {
                            process.exit(1);
                        }
                    })
                    .on("end", () => {
                        // revert modules paths
                        // au cas où un test défini la variable document permet d'éviter que le chargement de 'sinon' échoue
                        delete global.document;
                    }),
            );
        };
    }
}

module.exports = RunTestMocha;
