"use strict";

const path = require("path");

const Task = require("./../task");

class WatchTypeScript extends Task {

    task(gulp, helper, conf, project) {
        //Pourquoi 2 fonctions: car quand gulp voit une fonction avec un parametre 'cb' il ne lit plus le retour du gulp.watch
        if (helper.isIDE()) {
            return (done) => {
                helper.debug("Ignore watchTypeScript");
                done();
            };
        } else {
            return (done) => {
                helper.debug("Activation de watchTypeScript");
                gulp.watch(helper.getFile() || conf.sourcesTS.concat(conf.postTSClean.map((elt)=>{return "!"+elt})), ["compile-no-clean:ts"]);
                done();
            };
        }
    }
}


module.exports = WatchTypeScript;
