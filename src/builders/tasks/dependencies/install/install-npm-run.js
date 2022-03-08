const commander = require("../../../../gulp/commander");
const Task = require("../../task");

class InstallNpmRunInstall extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, option) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.option = option || {};
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            helper.stream(done, gulp.src(["./package.json"]).pipe(commander.gulpPlugin()));
        };
    }
}

module.exports = InstallNpmRunInstall;
