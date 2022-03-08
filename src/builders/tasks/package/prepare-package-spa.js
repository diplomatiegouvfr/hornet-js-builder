const Task = require("../task");

/**
 * Fonction générique de recopie de fichiers vers le repertoire de destination
 */
class PreparePackageSpa extends Task {
    task(gulp, helper, conf, project) {
        return (done) => {
            const base = undefined;

            if (Array.isArray(conf.spaResources)) {
                Array.prototype.push.apply(conf.complementarySpaSources, conf.spaResources);
            }

            if (conf.spaFilter && Array.isArray(conf.spaFilter)) {
                let resultFilter;
                conf.spaFilter.map((filter) => {
                    const reg = new RegExp(filter);
                    resultFilter = conf.complementarySpaSources.filter((word) => {
                        return reg.test(word);
                    });
                });
                conf.complementarySpaSources = resultFilter;
            }

            helper.stream(
                done,
                gulp
                    .src(conf.complementarySpaSources, {
                        base,
                        cwd: project.dir,
                    })
                    .pipe(gulp.dest(conf.static)),
            );
        };
    }
}

module.exports = PreparePackageSpa;
