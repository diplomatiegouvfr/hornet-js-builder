"use strict";

const path = require("path");
const _ = require("lodash");
const concat = require("gulp-concat");

const docker = require("../docker/docker-runner");

const defaultConf = require("../conf/default-conf");

// déclaration des tâches
const RunTestsInclusion = require("./tasks/tests/run-tests");
const InstrumentSourcesTest = require("./tasks/tests/intrument-sources");
const PrepareTestSources = require("./tasks/tests/prepare-test-sources");
const CompileTypeScript = require("./tasks/compile/compile-typescript");
const CompileTypeScriptDefinition = require("./tasks/compile/compile-typescript-definition");
const GenerateDefinition = require("./tasks/compile/index/generate-definition");
const GenerateIndexDefinition = require("./tasks/compile/index/generate-index-definition");
const GenerateIndexExport = require("./tasks/compile/index/generate-index-export");
const CompileTypeScriptIndex = require("./tasks/compile/index/compile-typescript-index");
const CleanTask = require("./tasks/clean/clean");
const PreparePackageDll = require("./tasks/package/prepare-package-dll");
const PreparePackageClient = require("./tasks/package/prepare-package-client");
const PreparePackageSpa = require("./tasks/package/prepare-package-spa");
const PreparePackage = require("./tasks/package/prepare-package");
const PrepareClean = require("./tasks/package/prepare-clean");
const ThemeInclusion = require("./tasks/theme/theme-app");
const CommunityThemeInclusion = require("./tasks/theme/theme-community");
const ZipStaticTask = require("./tasks/zip/zip-static");
const ZipDynamicTask = require("./tasks/zip/zip-dynamic");
const ZipDatabaseTask = require("./tasks/zip/zip-database");
const WatchTypeScript = require("./tasks/watch/watch-typescript");
const WatchServer = require("./tasks/watch/watch-server");
const LintTask = require("./tasks/lint/lint");
const WatchDTypeScript = require("./tasks/watch/watch-d-typescript");
const BuildDockerImages = require("./tasks/docker/build-docker-images");
const PublishDockerImages = require("./tasks/docker/publish-docker-images");
const ModulePublish = require("./tasks/publish/module-publish");
const ZipEnvironment = require("./tasks/zip/zip-environment");
const RunTestKarma = require('./tasks/tests/run-test-karma');
const RunTestMocha = require('./tasks/tests/run-test-mocha');
const MergeReportsTests = require('./tasks/tests/merge-reports');
const RemapReportsTests = require('./tasks/tests/remap-reports');
const Template = require('./tasks/package/template');
const ValidateTestTemplate = require("./tasks/depaut/validate-test-template");
const GenerateTestTemplate = require("./tasks/depaut/generate-test-template");
const Properties2json = require("./tasks/depaut/properties2json");
const FindUnusedTemplateVar = require("./tasks/depaut/find-unused-template-var");

const Utils = require("./tasks/utils");
FindUnusedTemplateVar
module.exports = {
    gulpTasks: (gulp, project, conf, helper) => {

        let fileDckCompose = project.dir + "/docker-compose.yml";

        conf = defaultConf.buildConf(project, conf, helper);

        function isModeDockerGoOn() {
            return helper.fileExists(fileDckCompose) && !_.isUndefined(helper.getDocker());
        }

        function watchDocker(watch) {
            if (isModeDockerGoOn()) {
                return function () {
                    docker.watch(helper.getDocker().options, helper.getCommandArgs(), watch, helper.getDocker().service);
                }
            }
        }

        //
        // Les micros étapes Gulp
        //
        new CleanTask("clean:build", "", [], gulp, helper, conf, project, conf.cleanBuildElements);
        new CleanTask("clean:test", "", [], gulp, helper, conf, project, conf.cleanTestElements);
        new CleanTask("clean:static", "", [], gulp, helper, conf, project, conf.cleanStaticElements);
        new CleanTask("clean:static-dll", "", [], gulp, helper, conf, project, conf.cleanStaticDllElements);
        new CleanTask("clean:Theme", "", [], gulp, helper, conf, project, conf.cleanThemeElements);
        new CleanTask("clean:src", "", [], gulp, helper, conf, project, conf.cleanElements);
        new CleanTask("clean:template", "", [], gulp, helper, conf, project, conf.cleanTemplateElements);
        gulp.task("clean:static-all", ["clean:static", "clean:static-dll"]);
        gulp.task("clean", ["clean:src", "clean:test"]);
        gulp.task("clean-all", ["clean", "clean:build", "dependencies:clean-all", "clean:static-all", "clean:template"]);

        new CompileTypeScript("compile:ts", "", ["clean", "dependencies:install-ts-definition"], gulp, helper, conf, project);
        new CompileTypeScript("compile-no-clean:ts", "", ["dependencies:install-ts-definition"], gulp, helper, conf, project);
        
        if (project.type === helper.TYPE.APPLICATION) {
            gulp.task("compile", ["compile:ts"]);

        } else {
            new CompileTypeScriptDefinition("compile:dts", "", ["compile:ts"], gulp, helper, conf, project);
            new CompileTypeScriptDefinition("compile-no-clean:dts", "", ["compile-no-clean:ts"], gulp, helper, conf, project);
            new GenerateIndexExport("compile-index:index", "", ["compile-index:dts"], gulp, helper, conf, project);
            new GenerateDefinition("compile-index:ts", "", [], gulp, helper, conf, project);
            new GenerateIndexDefinition("compile-index:dts", "", ["compile-index:ts"], gulp, helper, conf, project);
            new CompileTypeScriptIndex("compile:index", "", ["compile-index:index"], gulp, helper, conf, project);
            gulp.task("compile", ["generate-index:dts", "compile:dts"]);
            gulp.task("generate-index", ["compile:index"]);
            gulp.task("generate-index:dts", ["dependencies:install-ts-definition", "compile-index:dts"]);
        }

        // Exécution des tests
        new CleanTask("clean-test:mocha", "", [], gulp, helper, conf, project, conf.istanbul.reportOpts.dir);
        new CleanTask("clean-test:karma", "", [], gulp, helper, conf, project, conf.karma.reportOpts.dir);
        new CleanTask("clean-test:merge", "", [], gulp, helper, conf, project, conf.merge.reportOpts.dir);
        new CleanTask("clean-test:remap", "", [], gulp, helper, conf, project, conf.remap.reportOpts.dir);
        new PrepareTestSources("prepare:testSources", "", ["compile"], gulp, helper, conf, project);
        new InstrumentSourcesTest("test:instrument", "", ["prepare:testSources"], gulp, helper, conf, project);
        //new RunTestsInclusion("test", "", ["clean:test", "test:mocha", "test:karma"], gulp, helper, conf, project);
        gulp.task("test", ["clean:test", "dependencies:install", "compile", "test:mocha-run", "test:karma-run", "test:merge-reports", "test:remap-reports"])
        new RunTestMocha("test:mocha", "", ["clean-test:mocha", "dependencies:install", "test:instrument"], gulp, helper, conf, project);
        new RunTestMocha("test:mocha-run", "", ["clean-test:mocha", "test:instrument"], gulp, helper, conf, project);
        new RunTestKarma("test:karma-run", "", ["clean-test:karma"], gulp, helper, conf, project);
        
        if (helper.getFile()) {
            new RunTestKarma("test:karma", "", ["clean-test:karma", "dependencies:install", "compile", "watch:ts"], gulp, helper, conf, project);
        } else {
            new RunTestKarma("test:karma", "", ["clean-test:karma", "dependencies:install", "compile"], gulp, helper, conf, project);
        }

        new MergeReportsTests("test:merge-reports", "", ["clean-test:merge"], gulp, helper, conf, project);
        new RemapReportsTests("test:remap-reports", "", ["clean-test:remap"], gulp, helper, conf, project);

        //Packaging
        if (project.type === helper.TYPE.APPLICATION) {
            new PreparePackageClient("prepare-package:minified", "", [], gulp, helper, conf, project, false, false);
            new PreparePackageSpa("prepare-package:spa", "", [], gulp, helper, conf, project);
            new PreparePackageClient("prepare-package-client", "", [], gulp, helper, conf, project, true, false);
            new PreparePackageDll("prepare-package-dll", "", [], gulp, helper, conf, project, true, false);
            new PreparePackage("prepare-all-package", "", ["prepare-clean"], gulp, helper, conf, project);
            new PrepareClean("prepare-clean", "", [], gulp, helper, conf, project);

            new Template("template-html", "", [], gulp, helper, conf, project);

            new ZipStaticTask("zip-static", "", [], gulp, helper, conf, project);
            new ZipDynamicTask("zip-dynamic", "", [], gulp, helper, conf, project);

            new Properties2json("generate-props2json", "", [], gulp, helper, conf, project);
            new GenerateTestTemplate("generate-template", "", ["generate-props2json"], gulp, helper, conf, project);
            new FindUnusedTemplateVar("find-unused-template-var", "", [], gulp, helper, conf, project);
            new ValidateTestTemplate("validate-template", "", ["generate-template"], gulp, helper, conf, project);
            new ZipEnvironment("zip-environment", "", ["validate-template", "find-unused-template-var"], gulp, helper, conf, project);

            new ZipDatabaseTask("zip-database", "", [], gulp, helper, conf, project);

            gulp.task("prepare-package", ["prepare-package:minified", "prepare-all-package"]);
            gulp.task("prepare-package-spa", ["prepare-package:spa", "prepare-package"]);

            gulp.task("package-zip-static", ["prepare-package:minified", "zip-static"]);
            gulp.task("package-zip-dynamic", ["prepare-package:minified", "zip-dynamic"]);

            if (isModeDockerGoOn()) {
                new BuildDockerImages("prepare-package-docker", "", [], gulp, helper, conf, project);
                gulp.task("package", ["compile", "test", "prepare-package:minified", "prepare-all-package", "zip-static", "zip-dynamic", "prepare-package-docker"]);
                new PublishDockerImages("publish", "", [], gulp, helper, conf, project);

            } else {
                gulp.task("package", ["compile", "test", "template-html", "prepare-package",  "zip-static", "zip-dynamic", "zip-environment", "zip-database"]);
                gulp.task("package:spa", ["compile", "test", "template-html", "prepare-package-spa", "zip-static", "zip-dynamic", "zip-environment", "zip-database"]);
            }

            // inclusion des themes en static applicatif
            new ThemeInclusion("dependencies:install-app-themes", "dependencies:install", [], gulp, helper, conf, project);
            new CommunityThemeInclusion("dependencies:install-community-themes", "dependencies:install", [], gulp, helper, conf, project);

        } else if (project.type === helper.TYPE.APPLICATION_SERVER) {
            new PreparePackage("prepare-all-package", "", ["prepare-clean"], gulp, helper, conf, project);
            new PrepareClean("prepare-clean", "", [], gulp, helper, conf, project);

            new Properties2json("generate-props2json", "", [], gulp, helper, conf, project);
            new GenerateTestTemplate("generate-template", "", ["generate-props2json"], gulp, helper, conf, project);
            new FindUnusedTemplateVar("find-unused-template-var", "", [], gulp, helper, conf, project);
            new ValidateTestTemplate("validate-template", "", ["generate-template"], gulp, helper, conf, project);
            new ZipEnvironment("zip-environment", "", ["validate-template", "find-unused-template-var"], gulp, helper, conf, project);

            new ZipDynamicTask("zip-dynamic", "", [], gulp, helper, conf, project);
            new ZipDatabaseTask("zip-database", "", [], gulp, helper, conf, project);

            gulp.task("package-zip-dynamic", ["prepare-package:minified", "zip-dynamic"]);
            gulp.task("package", ["compile", "test", "prepare-all-package", "zip-dynamic", "zip-environment", "zip-database"]);

        } else {
            gulp.task("package", ["test"]);
        }
        
        if (project.type === helper.TYPE.MODULE) {
            new ModulePublish("publish", "", ["dependencies:fix-app", "compile"/*, "test"*/], gulp, helper, conf, project);
        } else {
            if (project.type === helper.TYPE.APPLICATION || project.type === helper.TYPE.APPLICATION_SERVER) {
                gulp.addTaskDependency("publish", "install");
                gulp.addTaskDependency("publish", "package");
            }
            gulp.addTaskDependency("publish", "dependencies:fix-app");

        }

        // Par défaut, on package.
        gulp.task("default", ["package"]);

        //
        // Les étapes Gulp spéciales DEV
        //
        new WatchTypeScript("watch:ts", "", [], gulp, helper, conf, project);

        new LintTask("lint", "", ["compile"], gulp, helper, conf, project);

        if (project.type === helper.TYPE.APPLICATION) {

            // MODE Docker : n'est actif que si l'option -D ou --docker a été utilisé dans la ligne de commande
            //              ET si un fichier docker-compose.yml existe. En effet dans le cas des builds multi-modules, certains modules peuvent
            //              ne pas construire des images dockers
            if (isModeDockerGoOn()) {
                // Chargement du fichier de configuration sépcifique à Docker (default-docker.json)
                // Ce fichier permet de passer les arguments à commande de BUILD
                var defaultDockerJson = require(path.join(process.cwd(), "config", "default-docker.json"));
                if (defaultDockerJson != undefined && defaultDockerJson.build != undefined) {
                    Utils.checkVariables(defaultDockerJson);
                    var buildInfo = defaultDockerJson.build;
                    Object.getOwnPropertyNames(buildInfo).forEach((val) => {
                        process.env[val] = buildInfo[val];
                    });
                }

                gulp.task("watch", [], watchDocker("watch-dck"));
                gulp.task("watch:serveur", [], watchDocker("watch:serveur-dck"));
                gulp.task("watch:serveur-brk", [], watchDocker("watch:serveur-brk-dck"));
                gulp.task("watch:serveur-prod", [], watchDocker("watch:serveur-prod-dck"));

            } else {

                new WatchServer("watch:serveur", "", ["watch:ts"], gulp, helper, conf, project, false, "development");
                new WatchServer("watch:serveur-brk", "", ["watch:ts"], gulp, helper, conf, project, true, "development");
                new WatchServer("watch:serveur-prod", "", ["watch:ts"], gulp, helper, conf, project, false, "production");
                gulp.task("watch", ["dependencies:install", "compile", "watch:client", "watch:serveur"]);
                new WatchServer("watch:serveur-dck", "", ["watch:ts"], gulp, helper, conf, project, false, "default-docker");
                new WatchServer("watch:serveur-brk-dck", "", ["watch:ts"], gulp, helper, conf, project, true, "default-docker");
                new WatchServer("watch:serveur-prod-dck", "", ["watch:ts"], gulp, helper, conf, project, false, "production-docker");
                gulp.task("watch-dck", ["dependencies:install", "compile", "watch:client", "watch:serveur-dck"]);
            }

            //
            // Gestion de la construction et de l'écoute des fichiers clients
            //
            new PreparePackageClient("watch:client", "", ["clean:static", "prepare-package-dll", "watch:ts"], gulp, helper, conf, project, true, true);
            new PreparePackageClient("watch:client-prod", "", ["clean:static", "watch:ts"], gulp, helper, conf, project, false, true);
            gulp.task("watch-prod", ["dependencies:install", "compile", "watch:client-prod", "watch:serveur-prod"]);

            // raccourcis
            gulp.task("ws", ["watch:serveur"]);
            gulp.task("wsd", ["watch:serveur-brk"]);
            gulp.task("wc", ["watch:client"]);
            gulp.task("wp", ["watch-prod"]);
            gulp.task("pp", ["prepare-package"]);

        } else if(project.type === helper.TYPE.APPLICATION_SERVER){
            new WatchServer("watch:serveur", "", ["watch:ts"], gulp, helper, conf, project, false, "development");
            new WatchServer("watch:serveur-brk", "", ["watch:ts"], gulp, helper, conf, project, true, "development");
            new WatchServer("watch:serveur-prod", "", ["watch:ts"], gulp, helper, conf, project, false, "production");
            gulp.task("watch", ["dependencies:install", "compile", "watch:serveur"]);
            gulp.task("watch-prod", ["dependencies:install", "compile", "watch:serveur-prod"]);
            gulp.task("wp", ["watch-prod"]);
            gulp.task("pp", ["prepare-package"]);

        } else {
            new WatchDTypeScript("watch:dts", "", ["compile:dts"], gulp, helper, conf, project);
            gulp.task("watch", ["compile", "watch:dts"]);
        }

        // raccourcis
        gulp.task("w", ["watch"]);
    }
};