"use strict";

const State = require("../../state");
const Utils = require("../utils");

const Task = require("../task");
const npm = require("npm");

class GetLastVersion extends Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
    }

    getlastVersionSnapshot(packageJson, module){
        let snapshotVersion;
        Object.keys(packageJson).filter(
            (key) => ["tsDefinitionDependencies", "appDependencies", "testDependencies", "buildDependencies"].includes(key)).map(
                (key) => {
                    if(packageJson[key] && !snapshotVersion){
                        snapshotVersion = packageJson[key][module];
                    }
                });
        return snapshotVersion;
    }

    task(gulp, helper, conf, project) {
        return (done) => {
            npm.config.set("json", 1);
            let moduleName = helper.getModule() || project.name;
            helper.info("Récupération de la version pour le module : ", moduleName);
            helper.debug
            let res = npm.view(moduleName, "versions", (err, ret) => {
                if(!ret){
                    helper.info("Pas de version trouvé pour le module : ", moduleName);
                    return;
                }
                let versions = ret[Object.keys(ret)[0]].versions;

                if (helper.getVersion() && helper.getVersion() != "auto") {
                    let snapshotVersion;
                    if(helper.getVersion() === "snapshot"){
                        if (State.moduleList) {
                            // multi-module
                            Object.keys(State.moduleList).forEach(projectName =>  {
                                if(!snapshotVersion){
                                    snapshotVersion = this.getlastVersionSnapshot(State.moduleList[projectName].packageJson, moduleName);
                                }
                            });
                        }else{
                            snapshotVersion = this.getlastVersionSnapshot(project.packageJson, moduleName);

                        }
                    }
                    versions = versions.filter((version)=>{
                        return version.indexOf(snapshotVersion || helper.getVersion()) == 0;
                    });
                }

                let version = versions[versions.length - 1];
                helper.info("Last Version:", version);
                State.version = version;
                State.result = version;
                done();
            });
            
        }
    }

    
}


module.exports = GetLastVersion;