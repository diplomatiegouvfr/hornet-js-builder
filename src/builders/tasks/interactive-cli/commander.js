const Task = require("../task");
const gulp = require("gulp");
const inquirer = require("inquirer");
inquirer.registerPrompt("autocomplete", require("inquirer-autocomplete-prompt"));
const Helper = require("../../../helpers");

class Commander extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
        this.commander = helper.getCommander();
        this.options = helper.initCommanderFromHelper();
        this.currentOptions = {};
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            project.watch = true;
            process.nextTick(() => {
                this.prompt();
            });
        };
    }

    prompt() {
        inquirer
            .prompt([
                {
                    type: "autocomplete",
                    name: "task",
                    message: "task",
                    suggestOnly: true,
                    source(answers, input) {
                        return Promise.resolve(input ? Object.keys(gulp._registry._tasks).filter((t) => t.startsWith(input)) : ["default"]);
                    },
                    validate(input) {
                        return !!gulp._getTask(input);
                    },
                },
                {
                    type: "checkbox",
                    name: "options",
                    message: "options",
                    choices: Helper.getCommander()
                        .options.filter((o) => o.flags.indexOf("<") == -1)
                        .map((o) => {
                            if (this.options[o.long.substring(2)]) {
                                return {
                                    value: o.long,
                                    checked: true,
                                    disabled: true,
                                };
                            }
                            if (this.currentOptions[o.long.substring(2)]) {
                                return {
                                    value: o.long,
                                    checked: true,
                                };
                            }
                            return o.long;
                        }),
                },
            ])
            .then((answers) => {
                console.log(answers);
                for (const o in this.currentOptions) {
                    this.currentOptions[o] = this.currentOptions[o] === true ? false : this.currentOptions[o];
                }
                if (answers.options.length > 0) {
                    answers.options.forEach((options) => {
                        this.currentOptions[options.substring(2)] = true;
                    });
                }
                Helper.initFromCommander({ ...this.options, ...this.currentOptions });
                gulp.series(answers.task)((err) => {
                    err && console.error("Error :", err);
                    this.prompt();
                });
            });
    }
}

module.exports = Commander;
