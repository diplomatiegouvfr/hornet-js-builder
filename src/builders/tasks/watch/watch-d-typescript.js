"use strict";

const Task = require("./../task");

class WatchDTypeScript extends Task {

    task(gulp, helper, conf, project) {
        return () => {
            var watchConf = conf.sourcesTS;
            if (helper.isIDE()) {
                // On prend directement les DTS
                watchConf = conf.sourcesDTS;
            }

            var watchOptions = {
                debounceDelay: 200
            };
            var watcher = gulp.watch(watchConf, watchOptions, ["compile-no-clean:dts"]);
            watcher.on("change", function (event) {
                helper.debug("Fichier ", event.path, "a été", event.type);
            });
            return watcher;
        }
    }
}


module.exports = WatchDTypeScript;