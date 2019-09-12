"use strict";

const path = require("path");
const _ = require("lodash");
const concat = require("gulp-concat");

const defaultConf = require("../conf/default-conf");

// déclaration des tâches
const InstrumentSourcesTest = require("./tasks/tests/intrument-sources");
const PrepareTestSources = require("./tasks/tests/prepare-test-sources");
const CompileTypeScript = require("./tasks/compile/compile-typescript");
const AbsolutizeModule = require("./tasks/compile/absolutalize-module");
const GenerateIndexDefinition = require("./tasks/compile/index/generate-index-definition");
const GenerateIndexExport = require("./tasks/compile/index/generate-index-export");
const CompileTypeScriptIndex = require("./tasks/compile/index/compile-typescript-index");
const CleanTask = require("./tasks/clean/clean");
const PreparePackageDll = require("./tasks/package/prepare-package-dll");
const PreparePackageClient = require("./tasks/package/prepare-package-client");
const PreparePackageSpa = require("./tasks/package/prepare-package-spa");
const PreparePackage = require("./tasks/package/prepare-package");
const PrepareClean = require("./tasks/package/prepare-clean");
const ZipStaticTask = require("./tasks/zip/zip-static");
const ZipDynamicTask = require("./tasks/zip/zip-dynamic");
const ZipDatabaseTask = require("./tasks/zip/zip-database");
const WatchTypeScript = require("./tasks/watch/watch-typescript");
const WatchServer = require("./tasks/watch/watch-server");
const LintTask = require("./tasks/lint/lint");
const WatchDTypeScript = require("./tasks/watch/watch-d-typescript");
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
const ProcessSass = require("./tasks/sass/process-scss");
const ProcessImg = require("./tasks/sass/process-img");

const Task = require("./tasks/task");

module.exports = {
    gulpTasks: (gulp, project, conf, helper) => {

        conf = defaultConf.buildConf(project, conf, helper);

        //
        // Les micros étapes Gulp
        //
        new CleanTask("clean:build", "", [], gulp, helper, conf, project, conf.cleanBuildElements);
        new CleanTask("clean:test", "", [], gulp, helper, conf, project, conf.cleanTestElements);
        new CleanTask("clean:static", "", [], gulp, helper, conf, project, conf.cleanStaticElements);
        new CleanTask("clean:static-dll", "", [], gulp, helper, conf, project, conf.cleanStaticDllElements);
        new CleanTask("clean:src", "", [], gulp, helper, conf, project, conf.cleanElements);
        new CleanTask("clean:template", "", [], gulp, helper, conf, project, conf.cleanTemplateElements);
        new CleanTask("clean:publish", "", [], gulp, helper, conf, project, path.join(project.dir, "tmpPublish"));

        new Task("clean:static-all", "", ["clean:static", "clean:static-dll"], gulp, helper, conf, project);
        new Task("clean", "", ["clean:src", "clean:test"], gulp, helper, conf, project);
        new Task("clean-all", "", ["clean", "clean:build", "dependencies:clean-all", "clean:static-all", "clean:template", "clean:publish"], gulp, helper, conf, project);

        new CompileTypeScript("compile:ts", "", ["clean"], gulp, helper, conf, project);
        new CompileTypeScript("compile-no-clean:ts", "", [], gulp, helper, conf, project);
        new AbsolutizeModule("rewrite:module", "", [], gulp, helper, conf, project);

        new Task("compile:run", "", ["compile:ts"], gulp, helper, conf, project);
        if (project.type === helper.TYPE.APPLICATION) {
            new Task("compile", "", ["install", "compile:ts"], gulp, helper, conf, project);
            new Task("compile-no-clean:ts:all", "", ["compile-no-clean:ts", "rewrite:module"], gulp, helper, conf, project);
        } else {
            if (project.type === helper.TYPE.MODULE || project.type === helper.TYPE.COMPOSANT) {
                new CleanTask("clean:index", "", [], gulp, helper, conf, project, [conf.cleanIndexElements.ts, conf.cleanIndexElements.dts]);
                new CleanTask("clean:index-dts", "", [], gulp, helper, conf, project, [conf.cleanIndexElements.dts]);
                new GenerateIndexDefinition("compute-index:dts", "", [], gulp, helper, conf, project);
                new GenerateIndexExport("compute-index:ts", "", [], gulp, helper, conf, project);
                new CompileTypeScriptIndex("compile:index", "", ["compute-index:ts"], gulp, helper, conf, project);

                new Task("generate-index:ts", "", ["compute-index:ts"], gulp, helper, conf, project);
                new Task("generate-index:dts", "", ["compile:ts", "clean:index-dts", "compute-index:dts"], gulp, helper, conf, project);
                new Task("generate-index", "", ["generate-index:dts", "generate-index:ts"], gulp, helper, conf, project);


                // si pas autogenere les tâches sont disponibles et peuvent être lancées manuelement
                // sinon la tache de compile les lancera
                new Task("compile", "", ["install", "compile:ts", "clean:index-dts", "compute-index:dts", "rewrite:module"], gulp, helper, conf, project);
                new Task("compile:run", "", ["compile:ts", "clean:index-dts", "compute-index:dts", "rewrite:module"], gulp, helper, conf, project);
                new Task("compile:watch", "", ["dependencies:install", "dependencies:install-link", "generate-index:ts", "clean:index-dts", "compute-index:dts", "rewrite:module"], gulp, helper, conf, project);
                gulp.addTaskDependency("clean-all", "clean:index");
                new Task("compile-no-clean:ts:all", "", ["compile-no-clean:ts", "generate-index:ts", "compute-index:dts", "rewrite:module"], gulp, helper, conf, project);
            } else {
                new Task("compile", "", ["install", "compile:ts"], gulp, helper, conf, project);
                new Task("compile-no-clean:ts:all", "", ["dependencies:install", "dependencies:install-link", "compile-no-clean:ts"], gulp, helper, conf, project);
            }
        }
        // Exécution des tests
        new CleanTask("clean-test:mocha", "", [], gulp, helper, conf, project, conf.istanbul.reportOpts.dir);
        new CleanTask("clean-test:karma", "", [], gulp, helper, conf, project, conf.karma.reportOpts.dir);
        new CleanTask("clean-test:merge", "", [], gulp, helper, conf, project, conf.merge.reportOpts.dir);
        new CleanTask("clean-test:remap", "", [], gulp, helper, conf, project, conf.remap.reportOpts.dir);
        new InstrumentSourcesTest("test:instrument", "", ["prepare:testSources"], gulp, helper, conf, project);
        new RunTestMocha("test:mocha:exe", "", [], gulp, helper, conf, project);
        new RunTestKarma("test:karma:run", "", ["clean-test:karma"], gulp, helper, conf, project);

        if (project.type === helper.TYPE.MODULE || project.type === helper.TYPE.COMPOSANT) {
            new PrepareTestSources("prepare:testSources", "", ["compile:ts", "clean:index-dts", "compute-index:dts"], gulp, helper, conf, project);
            new RunTestMocha("test:mocha", "", ["clean-test:mocha", "dependencies:install", "dependencies:install-link",  "test:instrument", "rewrite:module"], gulp, helper, conf, project);
            new RunTestMocha("test:mocha:run", "", ["clean-test:mocha", "test:instrument", "rewrite:module"], gulp, helper, conf, project);
            new Task("test", "", ["clean:test", "install", "compile:ts", "generate-index:dts", "test:mocha:run", "test:karma:run", "test:merge-reports", "test:remap-reports", "rewrite:module"], gulp, helper, conf, project);
            new Task("test:run", "", ["clean:test", "generate-index:dts", "test:mocha:run", "test:karma:run", "test:merge-reports", "test:remap-reports", "rewrite:module"], gulp, helper, conf, project);
        } else {
            new PrepareTestSources("prepare:testSources", "", ["compile:ts"], gulp, helper, conf, project);
            new RunTestMocha("test:mocha", "", ["clean-test:mocha", "dependencies:install", "dependencies:install-link",  "test:instrument"], gulp, helper, conf, project);
            new RunTestMocha("test:mocha:run", "", ["clean-test:mocha", "test:instrument"], gulp, helper, conf, project);
            new Task("test", "", ["clean:test", "install", "compile:ts", "test:mocha:run", "test:karma:run", "test:merge-reports", "test:remap-reports"], gulp, helper, conf, project);
            new Task("test:run", "", ["clean:test", "test:mocha:run", "test:karma:run", "test:merge-reports", "test:remap-reports"], gulp, helper, conf, project);
        }

        if (helper.getFile()) {
            new Task("test:karma", "", ["clean-test:karma", "install",  "compile:ts", "test:karma:run", "watch:ts:exe"], gulp, helper, conf, project);
        } else {
            new Task("test:karma", "", ["install",  "compile:ts", "test:karma:run"], gulp, helper, conf, project);
        }

        new MergeReportsTests("test:merge-reports", "", ["clean-test:merge"], gulp, helper, conf, project);
        new RemapReportsTests("test:remap-reports", "", ["clean-test:remap"], gulp, helper, conf, project);

        //Packaging
        if (project.type === helper.TYPE.APPLICATION) {
            new PreparePackageClient("prepare-package:minified", "", [], gulp, helper, conf, project, false, false);
            new PreparePackageSpa("prepare-package:spa", "", [], gulp, helper, conf, project);
            new PreparePackageClient("prepare-package-client", "", ["prepare-package-dll"], gulp, helper, conf, project, true, false);
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

            new Task("prepare-package", "", ["prepare-package:minified", "prepare-all-package"], gulp, helper, conf, project);
            new Task("prepare-package-spa", "", ["prepare-package:spa", "prepare-package"], gulp, helper, conf, project);
            new Task("package-zip-static", "", ["prepare-package:minified", "zip-static"], gulp, helper, conf, project);
            new Task("package-zip-dynamic", "", ["prepare-package:minified", "zip-dynamic"], gulp, helper, conf, project);

            new Task("package", "", ["template-html", "prepare-package", "dependencies:install-ci-prod", "zip-static", "zip-dynamic", "zip-environment", "zip-database"], gulp, helper, conf, project);
            new Task("package:spa", "", ["compile", "test", "template-html", "prepare-package-spa", "dependencies:install-ci-prod", "zip-static", "zip-dynamic", "zip-environment", "zip-database"], gulp, helper, conf, project);

            // inclusion des themes en static applicatif
            new Task("process:sass", "", ["process:img", "process:scss"], gulp, helper, conf, project);
            new Task("watch:sass", "", ["process:sass", "watch:scss"], gulp, helper, conf, project);

            // Generation css from scss
            new ProcessSass("process:scss", "", [], gulp, helper, conf, project);
            new ProcessSass("watch:scss", "", [], gulp, helper, conf, project, true, ["process:sass"]);

            // Déplacement des images sass
            new ProcessImg("process:img", "", [], gulp, helper, conf, project);

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

            new Task("package-zip-dynamic", "", ["prepare-package:minified", "zip-dynamic"], gulp, helper, conf, project);
            new Task("package", "", ["compile", "test", "dependencies:install-ci-prod", "prepare-all-package", "zip-dynamic", "zip-environment", "zip-database"], gulp, helper, conf, project);

        } else {
            new Task("package", "", ["test"], gulp, helper, conf, project);
        }

        new ModulePublish("publish", "", ["clean:publish", "compile"], gulp, helper, conf, project);
        if (project.type === helper.TYPE.APPLICATION || project.type === helper.TYPE.APPLICATION_SERVER) {
            gulp.addTaskDependency("publish", "package");
        } else {
            gulp.addTaskDependency("publish", "dependencies:install-ci-prod");
        }

        // Par défaut, le mode interactive.
        new Task("default", "", ["interactive"], gulp, helper, conf, project);

        //
        // Les étapes Gulp spéciales DEV
        if (project.type === helper.TYPE.APPLICATION || project.type === helper.TYPE.APPLICATION_SERVER) {
            new WatchTypeScript("watch:ts:exe", "", [], gulp, helper, conf, project);
            new WatchTypeScript("watch:ts:run", "", ["compile"], gulp, helper, conf, project);

        } else {
            new WatchTypeScript("watch:ts:exe", "", [], gulp, helper, conf, project);
            new WatchTypeScript("watch:ts:run", "", ["dependencies:install", "dependencies:install-link",  "generate-index", "generate-index:dts", "rewrite:module"], gulp, helper, conf, project);
        }

        helper.info("__la task rewrite est terminée");
        new LintTask("lint", "", ["compile"], gulp, helper, conf, project);

        if (project.type === helper.TYPE.APPLICATION) {

            new WatchServer("watch:serveur:exe", "", [], gulp, helper, conf, project, false, "development");
            new WatchServer("watch:serveur:run", "", ["watch:ts:run"], gulp, helper, conf, project, false, "development");
            new WatchServer("watch:serveur-brk", "", ["watch:ts:run"], gulp, helper, conf, project, true, "development");
            new WatchServer("watch:serveur-prod", "", ["watch:ts:run"], gulp, helper, conf, project, false, "production");
            new Task("watch:exe", "", ["watch:ts:exe", "watch:client:exe", "watch:serveur:exe"], gulp, helper, conf, project);
            new Task("watch:run", "", ["compile", "watch:ts:exe", "watch:client:exe", "watch:serveur:exe"], gulp, helper, conf, project);
            new Task("watch", "", ["dependencies:install", "compile", "watch:ts:exe", "watch:client:exe", "watch:serveur:exe"], gulp, helper, conf, project);

            //
            // Gestion de la construction et de l'écoute des fichiers clients
            //
            new PreparePackageClient("watch:client:exe", "", ["clean:static", "prepare-package-dll"], gulp, helper, conf, project, true, true, true);
            new PreparePackageClient("watch:client:run", "", ["clean:static", "prepare-package-dll"], gulp, helper, conf, project, true, true, false);
            new PreparePackageClient("watch:client", "", ["clean:static", "prepare-package-dll", "watch:ts:run"], gulp, helper, conf, project, true, true, false);
            new PreparePackageClient("watch:client-prod", "", ["clean:static", "watch:ts:run"], gulp, helper, conf, project, false, true);
            new Task("watch-prod", "", ["dependencies:install", "compile", "watch:client-prod", "watch:serveur-prod"], gulp, helper, conf, project);

            // raccourcis
            new Task("ws", "", ["watch:serveur:run"], gulp, helper, conf, project);
            new Task("wsd", "", ["watch:serveur-brk"], gulp, helper, conf, project);
            new Task("wc", "", ["watch:client"], gulp, helper, conf, project);
            new Task("wcr", "", ["watch:client:run"], gulp, helper, conf, project);
            new Task("wp", "", ["watch-prod"], gulp, helper, conf, project);
            new Task("pp", "", ["prepare-package"], gulp, helper, conf, project);
            new Task("ppc", "", ["prepare-package-client"], gulp, helper, conf, project);

        } else if (project.type === helper.TYPE.APPLICATION_SERVER) {
            new WatchServer("watch:serveur:exe", "", [], gulp, helper, conf, project, false, "development");
            new WatchServer("watch:serveur:run", "", ["watch:ts:run"], gulp, helper, conf, project, false, "development");
            new WatchServer("watch:serveur-brk", "", ["watch:ts:run"], gulp, helper, conf, project, true, "development");
            new WatchServer("watch:serveur-prod", "", ["watch:ts:run"], gulp, helper, conf, project, false, "production");

            new Task("watch:exe", "", ["watch:ts:exe", "watch:serveur:exe"], gulp, helper, conf, project);
            new Task("watch:run", "", ["compile", "watch:ts:exe", "watch:serveur:exe"], gulp, helper, conf, project);
            new Task("watch", "", ["dependencies:install", "compile", "watch:ts:exe", "watch:serveur:exe"], gulp, helper, conf, project);
            new Task("watch-prod", "", ["dependencies:install", "compile", "watch:serveur-prod"], gulp, helper, conf, project);
            new Task("wp", "", ["watch-prod"], gulp, helper, conf, project);
            new Task("pp", "", ["prepare-package"], gulp, helper, conf, project);

        } else {
            new WatchDTypeScript("watch:dts", "", ["compile:dts"], gulp, helper, conf, project);
            new Task("watch:exe", "", ["compile"/*, "watch:dts"*/], gulp, helper, conf, project);
        }

        new Task("w", "", ["watch"], gulp, helper, conf, project);
        new Task("wr", "", ["watch:run"], gulp, helper, conf, project);
        new Task("we", "", ["watch:exe"], gulp, helper, conf, project);
    }
};