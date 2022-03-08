const defaultConf = require("../conf/default-conf");

// déclaration des tâches
const CleanTask = require("./tasks/clean/clean");
const AbsolutizeModule = require("./tasks/compile/absolutalize-module");
const CompileTypeScript = require("./tasks/compile/compile-typescript");
const CompileTypeScriptIndex = require("./tasks/compile/index/compile-typescript-index");
const GenerateIndexDefinition = require("./tasks/compile/index/generate-index-definition");
const GenerateIndexExport = require("./tasks/compile/index/generate-index-export");
const PrepareClean = require("./tasks/package/prepare-clean");
const PreparePackage = require("./tasks/package/prepare-package");
const PreparePackageClient = require("./tasks/package/prepare-package-client");
const PreparePackageDll = require("./tasks/package/prepare-package-dll");
const PreparePackageSpa = require("./tasks/package/prepare-package-spa");
const Template = require("./tasks/package/template");
const PreparePublish = require("./tasks/publish/prepare-publish");
const Publish = require("./tasks/publish/publish");
const Task = require("./tasks/task");
const InstrumentSourcesTest = require("./tasks/tests/intrument-sources");
const MergeReportsTests = require("./tasks/tests/merge-reports");
const PrepareTestSources = require("./tasks/tests/prepare-test-sources");
const RemapReportsTests = require("./tasks/tests/remap-reports");
const RunTestKarma = require("./tasks/tests/run-test-karma");
const RunTestMocha = require("./tasks/tests/run-test-mocha");
const RestartServer = require("./tasks/watch/restart-server");
const WatchDTypeScript = require("./tasks/watch/watch-d-typescript");
const WatchServer = require("./tasks/watch/watch-server");
const WatchTypeScript = require("./tasks/watch/watch-typescript");
const ZipDatabaseTask = require("./tasks/zip/zip-database");
const ZipDynamicTask = require("./tasks/zip/zip-dynamic");
const ZipEnvironment = require("./tasks/zip/zip-environment");
const ZipStaticTask = require("./tasks/zip/zip-static");

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
        new CleanTask("clean:publish", "", [], gulp, helper, conf, project, conf.prepare.publish.outDir);

        new Task("clean:static-all", "", ["clean:static", "clean:static-dll"], gulp, helper, conf, project);
        new Task("clean", "", ["clean:src", "clean:test"], gulp, helper, conf, project);
        new Task("clean:project", "", ["clean", "clean:build", "dependencies:clean", "clean:static-all", "clean:template", "clean:publish"], gulp, helper, conf, project);
        new Task("clean-all", "", ["clean", "clean:build", "dependencies:clean-all", "clean:static-all", "clean:template", "clean:publish"], gulp, helper, conf, project);

        new CompileTypeScript("compile:ts", "", ["clean"], gulp, helper, conf, project);
        new CompileTypeScript("compile-no-clean:ts", "", [], gulp, helper, conf, project);
        new AbsolutizeModule("rewrite:module", "", [], gulp, helper, conf, project);

        new Task("compile:run", "", ["compile:ts"], gulp, helper, conf, project);
        new CleanTask("clean:index", "", [], gulp, helper, conf, project, [conf.cleanIndexElements.ts, conf.cleanIndexElements.dts]);
        new CleanTask("clean:index-dts", "", [], gulp, helper, conf, project, [conf.cleanIndexElements.dts]);
        new GenerateIndexDefinition("compute-index:dts", "", [], gulp, helper, conf, project);
        new GenerateIndexExport("compute-index:ts", "", [], gulp, helper, conf, project);
        new CompileTypeScriptIndex("compile:index", "", ["compute-index:ts"], gulp, helper, conf, project);

        new Task("generate-index:ts", "", ["compute-index:ts"], gulp, helper, conf, project);
        new Task("generate-index:dts", "", ["compile:ts", "clean:index-dts", "compute-index:dts"], gulp, helper, conf, project);
        new Task("generate-index:dts:run", "", ["clean:index-dts", "compute-index:dts"], gulp, helper, conf, project);
        new Task("generate-index", "", ["generate-index:dts", "generate-index:ts"], gulp, helper, conf, project);

        if (project.type === helper.TYPE.APPLICATION || project.type === helper.TYPE.APPLICATION_SERVER) {
            new Task("compile", "", ["install", "compile:ts"], gulp, helper, conf, project);
            new Task("compile-no-clean:ts:all", "", ["compile-no-clean:ts", "rewrite:module", "restart:serveur:exe"], gulp, helper, conf, project);
        } else if (project.type === helper.TYPE.MODULE || project.type === helper.TYPE.COMPOSANT) {
            // si pas autogenere les tâches sont disponibles et peuvent être lancées manuelement
            // sinon la tache de compile les lancera
            new Task("compile", "", ["install", "compile:ts", "clean:index-dts", "compute-index:dts", "rewrite:module"], gulp, helper, conf, project);
            new Task("compile:run", "", ["compile:ts", "clean:index-dts", "compute-index:dts", "rewrite:module"], gulp, helper, conf, project);
            gulp.addTaskDependency("clean-all", "clean:index");
            new Task("compile-no-clean:ts:all", "", ["compile-no-clean:ts", "generate-index:ts", "compute-index:dts", "rewrite:module"], gulp, helper, conf, project);
        } else {
            new Task("compile", "", ["install", "compile:ts"], gulp, helper, conf, project);
            new Task("compile-no-clean:ts:all", "", ["compile-no-clean:ts"], gulp, helper, conf, project);
        }
        // Exécution des tests
        new CleanTask("clean-test:mocha", "", [], gulp, helper, conf, project, conf.istanbul.reportOpts.dir);
        new CleanTask("clean-test:karma", "", [], gulp, helper, conf, project, conf.karma.reportOpts.dir);
        new CleanTask("clean-test:merge", "", [], gulp, helper, conf, project, conf.merge.reportOpts.dir);
        new CleanTask("clean-test:remap", "", [], gulp, helper, conf, project, conf.remap.reportOpts.dir);
        new InstrumentSourcesTest("test:instrument", "", ["prepare:testSources"], gulp, helper, conf, project);
        new InstrumentSourcesTest("test:instrument:exe", "", ["prepare:testSources:exe"], gulp, helper, conf, project);
        new RunTestMocha("test:mocha:exe", "", ["test:instrument:exe"], gulp, helper, conf, project);
        new RunTestMocha("test:mocha:reports:exe", "", ["test:mocha:exe", "test:merge-reports", "test:remap-reports"], gulp, helper, conf, project);
        new RunTestKarma("test:karma:run", "", ["clean-test:karma", "compile:ts"], gulp, helper, conf, project);
        new RunTestKarma("test:karma:exe", "", ["clean-test:karma"], gulp, helper, conf, project);
        new RunTestMocha("test:karma:reports:exe", "", ["test:karma:exe", "test:merge-reports", "test:remap-reports"], gulp, helper, conf, project);
        new PrepareTestSources("prepare:testSources:exe", "", [], gulp, helper, conf, project);

        if (project.type === helper.TYPE.MODULE || project.type === helper.TYPE.COMPOSANT) {
            new PrepareTestSources("prepare:testSources", "", ["compile:ts", "clean:index-dts", "compute-index:dts"], gulp, helper, conf, project);
            new RunTestMocha("test:mocha", "", ["clean-test:mocha", "install", "test:instrument", "rewrite:module"], gulp, helper, conf, project);
            new RunTestMocha("test:mocha:run", "", ["clean-test:mocha", "test:instrument"], gulp, helper, conf, project);
            new Task(
                "test",
                "",
                ["clean:test", "install", "compile:ts", "generate-index:dts:run", "test:karma:exe", "test:mocha:exe", "test:merge-reports", "test:remap-reports", "rewrite:module"],
                gulp,
                helper,
                conf,
                project,
            );
            new Task(
                "test:run",
                "",
                ["clean:test", "compile:ts", "generate-index:dts:run", "test:karma:exe", "test:mocha:exe", "test:merge-reports", "test:remap-reports", "rewrite:module"],
                gulp,
                helper,
                conf,
                project,
            );
        } else {
            new PrepareTestSources("prepare:testSources", "", ["compile:ts"], gulp, helper, conf, project);
            new RunTestMocha("test:mocha", "", ["clean-test:mocha", "install", "test:instrument"], gulp, helper, conf, project);
            new RunTestMocha("test:mocha:run", "", ["clean-test:mocha", "test:instrument"], gulp, helper, conf, project);
            new Task("test", "", ["clean:test", "install", "compile:ts", "test:karma:exe", "test:mocha:exe", "test:merge-reports", "test:remap-reports"], gulp, helper, conf, project);
            new Task("test:run", "", ["clean:test", "compile:ts", "test:karma:exe", "test:mocha:exe", "test:merge-reports", "test:remap-reports"], gulp, helper, conf, project);
        }

        if (helper.getFile()) {
            new Task("test:karma", "", ["clean-test:karma", "install", "compile:ts", "test:karma:exe"], gulp, helper, conf, project);
        } else if (project.type === helper.TYPE.MODULE || project.type === helper.TYPE.COMPOSANT) {
            new Task("test:karma", "", ["install", "compile:ts", "generate-index:dts", "test:karma:exe", "rewrite:module"], gulp, helper, conf, project);
        } else {
            new Task("test:karma", "", ["install", "test:karma:run"], gulp, helper, conf, project);
        }

        new MergeReportsTests("test:merge-reports", "", ["clean-test:merge"], gulp, helper, conf, project);
        new RemapReportsTests("test:remap-reports", "", ["clean-test:remap"], gulp, helper, conf, project);

        // Packaging
        if (project.type === helper.TYPE.APPLICATION || project.type === helper.TYPE.COMPOSANT) {
            new PreparePackageClient("prepare-package-client", "", ["prepare-package-dll"], gulp, helper, conf, project, true, false);
            new PreparePackageDll("prepare-package-dll", "", [], gulp, helper, conf, project, true, false);
            // raccourcis
            new Task("ppc", "", ["prepare-package-client"], gulp, helper, conf, project);
        }

        if (project.type === helper.TYPE.APPLICATION) {
            new PreparePackageClient("prepare-package:minified", "", [], gulp, helper, conf, project, false, false);
            new PreparePackageSpa("prepare-package:spa", "", [], gulp, helper, conf, project);
            new PreparePackage("prepare-all-package", "", ["prepare-clean"], gulp, helper, conf, project);
            new PrepareClean("prepare-clean", "", [], gulp, helper, conf, project);

            new Template("template-html", "", [], gulp, helper, conf, project);

            new ZipStaticTask("zip-static", "", [], gulp, helper, conf, project);
            new ZipDynamicTask("zip-dynamic", "", [], gulp, helper, conf, project);

            new ZipEnvironment("zip-environment", "", [], gulp, helper, conf, project);

            new ZipDatabaseTask("zip-database", "", [], gulp, helper, conf, project);

            new Task("prepare-package", "", ["prepare-package:minified", "prepare-all-package"], gulp, helper, conf, project);
            new Task("prepare-package-spa", "", ["prepare-package:spa", "prepare-package"], gulp, helper, conf, project);
            new Task("package-zip-static", "", ["prepare-package:minified", "zip-static"], gulp, helper, conf, project);
            new Task("package-zip-dynamic", "", ["prepare-package:minified", "zip-dynamic"], gulp, helper, conf, project);

            new Task("package:message", "", [], gulp, helper, conf, project, undefined, "Attention, cette tâche ne fonctionne qu'en mode installation globale !");
            new Task(
                "package",
                "",
                ["compile", "template-html", "prepare-package", "dependencies:install-ci-prod", "zip-static", "zip-dynamic", "zip-environment", "zip-database"],
                gulp,
                helper,
                conf,
                project,
            );
            new Task(
                "package:run",
                "",
                ["compile:run", "template-html", "prepare-package", "dependencies:install-ci-prod", "zip-static", "zip-dynamic", "zip-environment", "zip-database"],
                gulp,
                helper,
                conf,
                project,
            );
            new Task(
                "package:spa",
                "",
                ["compile", "test", "template-html", "prepare-package-spa", "dependencies:install-ci-prod", "zip-static", "zip-dynamic", "zip-environment", "zip-database"],
                gulp,
                helper,
                conf,
                project,
            );

            // inclusion des themes en static applicatif
            new Task("process:sass", "", ["process:img", "process:scss"], gulp, helper, conf, project);
            new Task("watch:sass", "", ["process:sass", "watch:scss"], gulp, helper, conf, project);

        } else if (project.type === helper.TYPE.APPLICATION_SERVER) {
            new PreparePackage("prepare-all-package", "", ["prepare-clean"], gulp, helper, conf, project);
            new PrepareClean("prepare-clean", "", [], gulp, helper, conf, project);
            new Task("prepare-package", "", ["prepare-all-package"], gulp, helper, conf, project);

            new ZipEnvironment("zip-environment", "", [], gulp, helper, conf, project);

            new ZipDynamicTask("zip-dynamic", "", [], gulp, helper, conf, project);
            new ZipDatabaseTask("zip-database", "", [], gulp, helper, conf, project);

            new Task("package-zip-dynamic", "", ["compile", "test", "prepare-package", "dependencies:install-ci-prod", "zip-dynamic"], gulp, helper, conf, project);
            new Task("package", "", ["compile", "test", "prepare-package", "dependencies:install-ci-prod", "zip-dynamic", "zip-environment", "zip-database"], gulp, helper, conf, project);
            new Task("package:run", "", ["compile:run", "prepare-package", "dependencies:install-ci-prod", "zip-dynamic", "zip-environment", "zip-database"], gulp, helper, conf, project);
        } else {
            new Task("package", "", ["test"], gulp, helper, conf, project);
        }

        new PreparePublish("prepare-publish", "", ["clean:publish", "package"], gulp, helper, conf, project);
        new PreparePublish("prepare-publish:run", "", ["clean:publish"], gulp, helper, conf, project);
        new PreparePublish("prepare-publish:exe", "", [], gulp, helper, conf, project);
        new Publish("publish", "", ["prepare-publish"], gulp, helper, conf, project, conf.prepare.publish.outDir);
        new Publish("publish:exe", "", [], gulp, helper, conf, project, conf.prepare.publish.outDir);
        if (project.type === helper.TYPE.APPLICATION || project.type === helper.TYPE.APPLICATION_SERVER) {
            gulp.addTaskDependency("prepare-publish", "package");
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
            new WatchTypeScript("watch:ts:run", "", ["dependencies:install", "dependencies:install-link", "generate-index", "generate-index:dts", "rewrite:module"], gulp, helper, conf, project);
        }
        if (project.type === helper.TYPE.APPLICATION || project.type === helper.TYPE.COMPOSANT) {
            new PreparePackageClient("watch:client:exe", "", ["clean:static", "prepare-package-dll"], gulp, helper, conf, project, true, true, true);
            new PreparePackageClient("watch:client:run", "", ["clean:static", "prepare-package-dll"], gulp, helper, conf, project, true, true, false);
            new PreparePackageClient("watch:client", "", ["clean:static", "prepare-package-dll", "watch:ts:run"], gulp, helper, conf, project, true, true, false);
            // raccourcis
            new Task("wc", "", ["watch:client"], gulp, helper, conf, project);
            new Task("wcr", "", ["watch:client:run"], gulp, helper, conf, project);
            new Task("wce", "", ["watch:client:exe"], gulp, helper, conf, project);
        }

        if (project.type === helper.TYPE.APPLICATION) {
            new RestartServer("restart:serveur:exe", "", [], gulp, helper, conf, project);
            new WatchServer("watch:serveur:exe", "", [], gulp, helper, conf, project, false, "development");
            new WatchServer("watch:serveur-brk:exe", "", [], gulp, helper, conf, project, true, "development");
            new WatchServer("watch:serveur-prod:exe", "", [], gulp, helper, conf, project, false, "production");
            new Task("watch:exe", "", gulp.parallel("watch:client:exe", "watch:ts:exe", "watch:serveur:exe"), gulp, helper, conf, project);
            new Task("watch:run", "", gulp.series("compile:run", gulp.parallel("watch:client:exe", "watch:ts:exe", "watch:serveur:exe")), gulp, helper, conf, project);
            new Task("watch", "", gulp.series("compile", gulp.parallel("watch:client:exe", "watch:serveur:exe")), gulp, helper, conf, project);

            new Task("watch:serveur:run", "", gulp.parallel("watch:ts:run", "watch:serveur:exe"), gulp, helper, conf, project, false, "development");
            new Task("watch:serveur-brk", "", gulp.parallel("watch:ts:run", "watch:serveur-brk:exe"), gulp, helper, conf, project, true, "development");
            new Task("watch:serveur-prod", "", gulp.parallel("watch:ts:run", "watch:serveur-prod:exe"), gulp, helper, conf, project, false, "production");

            //
            // Gestion de la construction et de l'écoute des fichiers clients
            //
            new PreparePackageClient("watch:client-prod", "", ["clean:static", "watch:ts:run"], gulp, helper, conf, project, false, true);
            new Task("watch-prod", "", gulp.series("compile", gulp.parallel("watch:client-prod", "watch:serveur-prod")), gulp, helper, conf, project);

            // raccourcis
            new Task("ws", "", ["watch:serveur:run"], gulp, helper, conf, project);
            new Task("wse", "", ["watch:serveur:exe"], gulp, helper, conf, project);
            new Task("wsd", "", ["watch:serveur-brk"], gulp, helper, conf, project);
            new Task("wp", "", ["watch-prod"], gulp, helper, conf, project);
            new Task("pp", "", ["prepare-package"], gulp, helper, conf, project);
            new Task("we", "", ["watch:exe"], gulp, helper, conf, project);
        } else if (project.type === helper.TYPE.APPLICATION_SERVER) {
            new RestartServer("restart:serveur:exe", "", [], gulp, helper, conf, project);
            new WatchServer("watch:serveur:exe", "", [], gulp, helper, conf, project, false, "development");
            new WatchServer("watch:serveur-brk:exe", "", [], gulp, helper, conf, project, true, "development");
            new WatchServer("watch:serveur-prod:exe", "", [], gulp, helper, conf, project, false, "production");
            new Task("watch:serveur:run", "", gulp.parallel("watch:ts:run", "watch:serveur:exe"), gulp, helper, conf, project);
            new Task("watch:serveur-brk", "", gulp.parallel("watch:ts:run", "watch:serveur-brk:exe"), gulp, helper, conf, project);
            new Task("watch:serveur-prod", "", gulp.parallel("watch:ts:run", "watch:serveur-prod:exe"), gulp, helper, conf, project);

            new Task("watch:exe", "", gulp.series("compile:run", gulp.parallel("watch:serveur:exe", "watch:ts:exe")), gulp, helper, conf, project);
            new Task("watch:run", "", gulp.series("compile:run", gulp.parallel("watch:serveur:exe", "watch:ts:exe")), gulp, helper, conf, project);
            new Task("watch", "", gulp.series("compile", gulp.parallel("watch:serveur:exe", "watch:ts:exe")), gulp, helper, conf, project);
            new Task("watch-prod", "", ["dependencies:install", "compile", "watch:serveur-prod"], gulp, helper, conf, project);
            new Task("wp", "", ["watch-prod"], gulp, helper, conf, project);
            new Task("pp", "", ["prepare-package"], gulp, helper, conf, project);
            new Task("wse", "", ["watch:serveur:exe"], gulp, helper, conf, project);
            new Task("we", "", ["watch:serveur:exe"], gulp, helper, conf, project);
        } else if (project.type === helper.TYPE.COMPOSANT) {
            new PreparePackageClient("watch:client:exe", "", ["clean:static", "prepare-package-dll"], gulp, helper, conf, project, true, true, true);
            new PreparePackageClient("watch:client:run", "", ["clean:static", "prepare-package-dll"], gulp, helper, conf, project, true, true, false);
            new PreparePackageClient("watch:client", "", ["clean:static", "prepare-package-dll", "watch:ts:run"], gulp, helper, conf, project, true, true, false);
            // raccourcis
            new Task("wc", "", ["watch:client"], gulp, helper, conf, project);
            new Task("wcr", "", ["watch:client:run"], gulp, helper, conf, project);
            new Task("wce", "", ["watch:client:exe"], gulp, helper, conf, project);

            new Task("watch:exe", "", ["compile:run", "watch:client:exe"], gulp, helper, conf, project);
            new Task("watch:run", "", ["compile:run", "watch:client:exe"], gulp, helper, conf, project);
            new Task("watch", "", ["dependencies:install", "compile", "watch:client:exe"], gulp, helper, conf, project);
        } else if (project.type === helper.TYPE.MODULE) {
            new Task("watch:exe", "", ["watch:ts:exe"], gulp, helper, conf, project);
            new Task("watch:run", "", ["compile:run", "watch:ts:exe"], gulp, helper, conf, project);
            new Task("watch", "", ["compile", "watch:exe"], gulp, helper, conf, project);
        } else {
            new WatchDTypeScript("watch:dts", "", ["compile:dts"], gulp, helper, conf, project);
            new Task("watch:exe", "", ["compile" /* , "watch:dts" */], gulp, helper, conf, project);
        }

        new Task("w", "", ["watch"], gulp, helper, conf, project);
        new Task("wr", "", ["watch:run"], gulp, helper, conf, project);
        new Task("we", "", ["watch:exe"], gulp, helper, conf, project);
    },
};
