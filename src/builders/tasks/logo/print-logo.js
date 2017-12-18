"use strict";

const Task = require("./../task");

class PrintLogo extends Task {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, keyDependency) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
        this.keyDependency = keyDependency;
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            console.log("  _    _                       _          _      \n" +
                " | |  | |                     | |        (_)     \n" +
                " | |__| | ___  _ __ _ __   ___| |_ ______ _ ___  \n" +
                " |  __  |/ _ \\| '__| '_ \\ / _ \\ __|______| / __| \n" +
                " | |  | | (_) | |  | | | |  __/ |_       | \\__ \\ \n" +
                " |_|  |_|\\___/|_|  |_| |_|\\___|\\__|      | |___/ \n" +
                "                                        _/ |     \n" +
                "                                       |__/      \n");
            done();
        }
    }
}


module.exports = PrintLogo;
