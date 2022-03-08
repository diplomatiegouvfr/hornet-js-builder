const Task = require("../task");

class WatchTypeScript extends Task {
    task(gulp, helper, conf, project) {
        // Pourquoi 2 fonctions: car quand gulp voit une fonction avec un parametre 'cb' il ne lit plus le retour du gulp.watch
        if (helper.isIDE()) {
            return (done) => {
                helper.debug("Ignore watchTypeScript");
                done();
            };
        }
        const watchOptions = {
            cwd: project.dir,
        };
        return () => {
            project.watch = true;
            gulp.watch(
                conf.sourcesTS.concat(
                    conf.postTSClean.map((elt) => {
                        return `!${elt}`;
                    }),
                ),
                watchOptions,
                gulp.series("compile-no-clean:ts:all"),
            ).on("change", (path) => {
                helper.info(`Fichier ${path} a été modifié.`);
            });
        };
    }
}

module.exports = WatchTypeScript;
