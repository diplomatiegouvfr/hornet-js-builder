"use strict";

const CleanTask = require("./tasks/clean/clean");
const CleanDockerContainer = require("./tasks/docker/clean-docker-container");
const InitReportDependencies = require("./tasks/dependencies/init/init-app-dependencies-report");
const CheckDependencies = require("./tasks/dependencies/check/check-dependencies");
const InstallAppDependencies = require("./tasks/dependencies/install/install-app-dependencies");
const InstallTDependencies = require("./tasks/dependencies/install/install-flat-dependencies");
const CleanFixedDependencies = require("./tasks/clean/clean-fixed-dependencies");
const DetectAppDependenciesChanges = require("./tasks/detect/detect-app-dependencies-changes");
const InstallTSDefinitionDependencies = require("./tasks/dependencies/install/install-ts-definition-dependencies");
const FixAppDependencies = require("./tasks/dependencies/fix/fix-app-dependencies");
const PublishTask = require("./tasks/publish/publish");
const UnPublishTask = require("./tasks/publish/unpublish");
const TraceDependencies = require("./tasks/trace/trace-dependencies");
const FixVersion = require("./tasks/version/fix-version");
const GetLastVersion = require("./tasks/version/get-last-version");
const FixDependencyVersion = require("./tasks/version/fix-dependency-version");
const LicenseHeader = require("./tasks/license/license-header");


/**
 * Module permettant de gérer les tâches communes :
 *   > gestion des dépendances
 *   > gestion du publish / unpublish
 */
module.exports = {
    gulpTasks: function (gulp, project, conf, helper) {

        // Dependencies tasks
        new CleanTask("dependencies:clean","", ["dependencies:clean-test", "dependencies:clean-build"], gulp, helper, conf, project, helper.NODE_MODULES_APP);
        new CleanTask("dependencies:clean-build","", [], gulp, helper, conf, project, helper.NODE_MODULES_BUILD);
        new CleanTask("dependencies:clean-test", "", [], gulp, helper, conf, project, helper.NODE_MODULES_TEST);
        new CleanTask("dependencies:clean-definition","", [], gulp, helper, conf, project, helper.TS_DEFINITIONS_DEPENDENCIES_PATH);
        new CleanTask("dependencies:clean-all","", ["dependencies:clean-definition", "dependencies:clean-fix"], gulp, helper, conf, project, [helper.NODE_MODULES, "test_report"]);
        new CleanDockerContainer("dependencies:clean-docker", "", [], gulp, helper, conf, project);

        new InitReportDependencies("dependencies:init", "", [], gulp, helper, conf, project, helper.APP_DEPENDENCIES);
        new InitReportDependencies("dependencies:test-init", "", [], gulp, helper, conf, project, helper.TEST_DEPENDENCIES);

        new CheckDependencies("dependencies:check-app", "", [], gulp, helper, conf, project, helper.APP_DEPENDENCIES);
        new CheckDependencies("dependencies:check-ts-definition", "", [], gulp, helper, conf, project, helper.TS_DEFINITIONS_DEPENDENCIES);

        new CleanFixedDependencies("dependencies:clean-fix", "", [], gulp, helper, conf, project);

        new DetectAppDependenciesChanges("dependencies:change-app", "", ["dependencies:check-app"], gulp, helper, conf, project);

        new FixAppDependencies("dependencies:fix-app", "", ["dependencies:clean-fix", "dependencies:init", "dependencies:change-app"], gulp, helper, conf, project);

        new InstallTSDefinitionDependencies("dependencies:install-ts-definition", "", ["dependencies:check-ts-definition"], gulp, helper, conf, project);
        new InstallAppDependencies("dependencies:install-app", "", ["dependencies:fix-app"], gulp, helper, conf, project);
        new InstallTDependencies("dependencies:install-test", "", ["dependencies:test-init"], gulp, helper, conf, project);
        new TraceDependencies("dependencies:trace", "", [], gulp, helper, conf, project);

        new FixVersion("versions:set", "", [], gulp, helper, conf, project);
        new FixDependencyVersion("dependency:set", "", [], gulp, helper, conf, project);
        new FixDependencyVersion("dependency:set-snapshot", "", ["versions:get"], gulp, helper, conf, project);
        new GetLastVersion("versions:get", "", [], gulp, helper, conf, project);
        
        
        new LicenseHeader("license:header", "", [], gulp, helper, conf, project);

        /*if (project.type !== helper.TYPE.APPLICATION) {
            helper.debug("Configuration du applicationAndModuleBuilder:", conf);
            gulp.task("dependencies:install", ["dependencies:install-ts-definition", "dependencies:install-app"]);
        } else {
            gulp.task("dependencies:install", ["dependencies:install-ts-definition", "dependencies:install-app", "dependencies:install-app-themes"]);
        }*/

        let installationTasks = ["dependencies:install-ts-definition", "dependencies:install-app"];
        if(!helper.isSkipTests()) {
            installationTasks.push("dependencies:install-test");
        }

        gulp.task("dependencies:install", installationTasks);
        gulp.task("install", ["dependencies:install"]);

        // Publishing tasks
        new PublishTask("publish", "", [], gulp, helper, conf, project);
        new UnPublishTask("unpublish", "", [], gulp, helper, conf, project);
    }
};