"use strict";

const Task = require("./../task");
const commander = require("../../../gulp/commander");
class UnPublishTask extends Task {

    task(gulp, helper, conf, project) {
        return (done) => {
            const args = ["unpublish", project.name + "@" + project.version];
            return commander.toPromise({ cmd: "npm", args: args, cwd: helper.getMainProcessDir() }, true).then((data) => {
                setTimeout(()=> {done();}, 2000)
            }).catch((err) => {
                helper.error(`La commande npm ${args} dans ${helper.getMainProcessDir()} est ko`);
                done(err);
            });
        }
    }
}

module.exports = UnPublishTask;
