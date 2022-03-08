const commander = require("../../../gulp/commander");
const Task = require("../task");

class Publish extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, publishDirectory) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.publishDirectory = publishDirectory || project.dir;
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            let args = ["publish", "--force"];
            if (helper.getRemainingArgs()) {
                args.push(helper.getRemainingArgs());
            }
            if (helper.getPublishRegistry()) {
                args = args.concat(["--registry", helper.getPublishRegistry()]);
            }
            helper.info(` npm : args ${args}, cwd: ${this.publishDirectory}`);
            return commander
                .toPromise({ cmd: "npm", args, cwd: this.publishDirectory }, false, (data) => {
                    if (/(err!)|(error)/i.exec(`${data}`)) {
                        helper.error(`${data}`);
                    } else {
                        helper.info(`${data}`);
                    }
                    done();
                })
                .catch((err) => {
                    helper.error(`La commande npm ${args} dans ${this.publishDirectory} est ko`);
                    helper.error(`Erreur durant la publication : ${project.name}, ERROR: ${err}`);
                    done(err);
                    process.exit(1);
                })
                .then((data) => {
                    setTimeout(() => {
                        done();
                    }, 2000);
                });
        };
    }
}

module.exports = Publish;
