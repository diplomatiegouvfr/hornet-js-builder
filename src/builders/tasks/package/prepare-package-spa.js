"use strict";

const Task = require("./../task");
const _ = require("lodash");

/**
 * Fonction générique de recopie de fichiers vers le repertoire de destination
 */
class PreparePackageSpa extends Task {

    task(gulp, helper, conf, project) {
        return (done) => {

            let base = undefined;

            if (_.isArray(conf.spaResources)) {
                Array.prototype.push.apply(conf.complementarySpaSources, conf.spaResources);
            }

            helper.stream(
                done,
                gulp.src(conf.complementarySpaSources, {
                    base: base
                }).pipe(gulp.dest(conf.static))
            );
        }
    }
}

module.exports = PreparePackageSpa;