const Task = require("../task");

class WatchDTypeScript extends Task {
    task(gulp, helper, conf, project) {
        return () => {
            let watchConf = conf.sourcesTS;
            if (helper.isIDE()) {
                // On prend directement les DTS
                watchConf = conf.sourcesDTS;
            }

            const watchOptions = {
                debounceDelay: 200,
            };
            const watcher = gulp.watch(watchConf, watchOptions, ["compile-no-clean:dts"]);
            watcher.on("change", function (event) {
                helper.debug("Fichier ", event.path, "a été", event.type);
            });
            return watcher;
        };
    }
}

module.exports = WatchDTypeScript;
