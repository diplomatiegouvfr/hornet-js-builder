const Utils = require("../utils");
const Prepare = require("./prepare");

class PrepareClean extends Prepare {
    task(gulp, helper, conf, project) {
        return (done) => {
            Utils.gulpDelete(helper, this.targetDir, project.dir)(done);
        };
    }
}

module.exports = PrepareClean;
