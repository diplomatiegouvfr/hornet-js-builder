const path = require("path");
const State = require("./state");
const CleanTask = require("./tasks/clean/clean");
const DedupeNpmDependencies = require("./tasks/dependencies/dedupe-npm-dependencies");
const FixDependenciesVersion = require("./tasks/dependencies/fix-version");
const InstallNpmCiDependencies = require("./tasks/dependencies/install/install-npm-ci");
const InstallNpmDependencies = require("./tasks/dependencies/install/install-npm-dependencies");
const InstallNpmRunInstall = require("./tasks/dependencies/install/install-npm-run");
const FileHeader = require("./tasks/file-header/file-header");
const InteractiveCLI = require("./tasks/interactive-cli/commander");
const Publish = require("./tasks/publish/publish");
const UnPublish = require("./tasks/publish/unpublish");
const Task = require("./tasks/task");
const FixDependencyVersion = require("./tasks/version/fix-dependency-version");
const FixVersion = require("./tasks/version/fix-version");
const GetLastVersion = require("./tasks/version/get-last-version");

/**
 * Module permettant de gérer les tâches communes :
 *   > gestion des dépendances
 *   > gestion du publish / unpublish
 */
module.exports = {
    gulpTasks(gulp, project, conf, helper) {
        if (process.cwd() == project.dir) {
            if (!State.moduleList[project.name]) {
                State.moduleList[project.name] = {};
            }
            State.moduleList[project.name].ModuleDependencies = helper.getModuleDependencies(project);
        }

        // Dependencies tasks
        new CleanTask("dependencies:clean", "", [], gulp, helper, conf, project, helper.NODE_MODULES);
        new CleanTask("dependencies:clean-all", "", [], gulp, helper, conf, project, [path.join(project.dir, helper.NODE_MODULES), path.join(project.dir, "package-lock.json")]);

        new InstallNpmDependencies("dependencies:install", "", [], gulp, helper, conf, project, false, true, false, false);
        new InstallNpmDependencies("dependencies:install-link", "", [], gulp, helper, conf, project, true, true, false, false, ["compile:run"]);
        new InstallNpmDependencies("dependencies:install-dev-link", "", [], gulp, helper, conf, project, true, false, true, false, ["compile:run"]);
        new InstallNpmDependencies("dependencies:install-dev", "", [], gulp, helper, conf, project, false, false, true, false);
        new InstallNpmDependencies("dependencies:install-ci-dev", "", [], gulp, helper, conf, project, false, false, true, true);
        new DedupeNpmDependencies("dependencies:dedupe", "", [], gulp, helper, conf, project);

        new InstallNpmCiDependencies("dependencies:install-ci-prod", "", [], gulp, helper, conf, project, true);

        new InstallNpmRunInstall("npm:run", "", [], gulp, helper, conf, project);

        new FixVersion("versions:set", "", [], gulp, helper, conf, project);
        new FixDependencyVersion("dependency:set", "", [], gulp, helper, conf, project);
        new FixDependencyVersion("dependency:set-snapshot", "", ["versions:get"], gulp, helper, conf, project);
        new GetLastVersion("versions:get", "", [], gulp, helper, conf, project);
        new FixDependenciesVersion("dependencies:versions:update", "", [], gulp, helper, conf, project);

        new FileHeader("file:header", "", [], gulp, helper, conf, project);

        new InteractiveCLI("interactive", "", [], gulp, helper, conf, project);

        if (helper.isSkipDedupe()) {
            new Task("install", "", ["dependencies:install", "dependencies:install-link", "dependencies:install-dev", "dependencies:install-dev-link"], gulp, helper, conf, project);
        } else {
            new Task(
                "install",
                "",
                ["dependencies:install", "dependencies:install-link", "dependencies:install-dev", "dependencies:install-dev-link", "dependencies:dedupe"],
                gulp,
                helper,
                conf,
                project,
            );
        }

        new Task("i", "", ["install"], gulp, helper, conf, project);

        // Publishing tasks
        new Publish("publish", "", [], gulp, helper, conf, project);
        new UnPublish("unpublish", "", [], gulp, helper, conf, project);
    },
};
