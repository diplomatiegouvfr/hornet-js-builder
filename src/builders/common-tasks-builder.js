"use strict";

const CleanTask = require("./tasks/clean/clean");
const PublishTask = require("./tasks/publish/publish");
const UnPublishTask = require("./tasks/publish/unpublish");
const FixVersion = require("./tasks/version/fix-version");
const GetLastVersion = require("./tasks/version/get-last-version");
const FixDependencyVersion = require("./tasks/version/fix-dependency-version");
const LicenseHeader = require("./tasks/license/license-header");
const InteractiveCLI = require("./tasks/interactive-cli/vorpal");

const InstallNpmDependencies = require("./tasks/dependencies/install/install-npm-dependencies");
const DedupeNpmDependencies = require("./tasks/dependencies/dedupe-npm-dependencies");
const InstallNpmRunInstall = require("./tasks/dependencies/install/install-npm-run");
const InstallNpmCiDependencies = require("./tasks/dependencies/install/install-npm-ci");

const Task = require("./tasks/task");
const State = require("./state");

/**
 * Module permettant de gérer les tâches communes :
 *   > gestion des dépendances
 *   > gestion du publish / unpublish
 */
module.exports = {
    gulpTasks: function (gulp, project, conf, helper) {

        if(process.cwd() == project.dir) {
            if(!State.moduleList[project.name]) {
                State.moduleList[project.name] = {};
            }
            State.moduleList[project.name].ModuleDependencies = helper.getModuleDependencies(project);
        }

        // Dependencies tasks
        new CleanTask("dependencies:clean","", [], gulp, helper, conf, project, helper.NODE_MODULES);
        new CleanTask("dependencies:clean-all","", [], gulp, helper, conf, project, [helper.NODE_MODULES, "package-lock.json"]);

        new InstallNpmDependencies("dependencies:install", "", [], gulp, helper, conf, project, false, true, false, false);
        new InstallNpmDependencies("dependencies:install-link", "", [], gulp, helper, conf, project, true, true, false, false);
        new InstallNpmDependencies("dependencies:install-dev-link", "", [], gulp, helper, conf, project, true, false, true, false);
        new InstallNpmDependencies("dependencies:install-dev", "", [], gulp, helper, conf, project, false, false, true, false);
        new InstallNpmDependencies("dependencies:install-ci-prod", "", [], gulp, helper, conf, project, false, false, false, true);
        new InstallNpmDependencies("dependencies:install-ci-dev", "", [], gulp, helper, conf, project, false, false, true, true);
        new DedupeNpmDependencies("dependencies:dedupe", "", [], gulp, helper, conf, project);
        
        new InstallNpmRunInstall("npm:run", "", [], gulp, helper, conf, project)

        new FixVersion("versions:set", "", [], gulp, helper, conf, project);
        new FixDependencyVersion("dependency:set", "", [], gulp, helper, conf, project);
        new FixDependencyVersion("dependency:set-snapshot", "", ["versions:get"], gulp, helper, conf, project);
        new GetLastVersion("versions:get", "", [], gulp, helper, conf, project);
        
        new LicenseHeader("license:header", "", [], gulp, helper, conf, project);

        new InteractiveCLI("interactive", "", [], gulp, helper, conf, project);
      
        new Task("install", "", ["dependencies:install", "dependencies:install-link", "dependencies:install-dev", "dependencies:install-dev-link", "dependencies:dedupe"], gulp, helper, conf, project);

        // Publishing tasks
        new PublishTask("publish", "", [], gulp, helper, conf, project);
        new UnPublishTask("unpublish", "", [], gulp, helper, conf, project);

    }
};