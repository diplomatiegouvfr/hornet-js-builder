"use strict";
const npm = require("npm");
const gutil = require("gulp-util");
const archy = require("archy");

const Task = require("./../task");
const State = require("./../../state");

class TraceDependencies extends Task {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, pattern) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.pattern = pattern;
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            let root = project.packageJson;

            let module =  helper.getModule() || project.packageJson.name;
            if(helper.getModule()) {

            }

            let s = {label: module, nodes: []};
            helper.getDependenciesReport(npm, root, State.externalDependencies, (report) => {
                let out = {label: helper.getModule(), nodes: this.makeArchy(report, true)};
                helper.info(archy(out));
                done();
            });
        }
    }


    makeArchy(report) {

        let deps = Object.keys(report);
        let arch = [];
        deps.map((parentDepName) => {
            let dep = Object.keys(report[parentDepName]);
            let version = (dep && dep[0]) ? dep[0] : "";
            let childDeps = report[parentDepName][version].deps2 || null;

            let nodes = [];

            if(childDeps) {
                let childrenNameDeps = Object.keys(childDeps);
                childrenNameDeps.map((childDepName) => {
                    let childVersion = Object.keys(childDeps[childDepName])[0];

                    nodes.push(childDepName + "@" + childVersion);
                });
            }
            arch.push({label: parentDepName + "@" + version, nodes: nodes});
        });

        return arch;

    }
}

module.exports = TraceDependencies;