const commander = require("../../../gulp/commander");
const Task = require("../task");

class UnPublish extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, publishDirectory) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.publishDirectory = publishDirectory || project.dir;
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            const args = ["unpublish", `${project.name}@${project.version}`];
            return commander
                .toPromise({ cmd: "npm", args, cwd: this.publishDirectory }, true)
                .then((data) => {
                    setTimeout(() => {
                        done();
                    }, 2000);
                })
                .catch((err) => {
                    helper.error(`La commande npm ${args} dans ${this.publishDirectory} est ko`);
                    done(err);
                });
        };
    }
}

module.exports = UnPublish;
