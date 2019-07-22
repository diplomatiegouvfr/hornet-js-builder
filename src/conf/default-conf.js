"use strict";

const path = require("path");
const fs = require("fs");
const lodashMerge = require ("lodash.merge");
const flatten = require ("lodash.flatten");
const merge = require('webpack-merge');

const staticDir = "static";
const testReportDir = "test_report";
const testWorkDir = "istanbul";

const defaultConf = {
    src: "src",
    test: "test",
    static: staticDir,
    database: "database",
    environment: {
        dir: "environment",
        configuration: "environment/configuration",
        templates: "environment/templates"
    },
    testEnvironment: {
        dir: "test-environment",
        configuration: "test-environment/configuration",
        templates: "test-environment/templates"
    },
    js: "js",
    dll: "dll",
    config: "./config",
    generatedTypings: {
        dir: ".",
        file: "definition.d.ts"
    },
    clientJs: "client.js",
    routesDirs: ["." + path.sep + "routes"],
    componentsDirs: [path.join("..", "src")],
    buildWorkDir: "target",
    testReportDir: testReportDir,
    testWorkDir: testWorkDir,
    templateDir: "html",
    mocha: {
        reporter: "mocha-multi-reporters",
        reporterOptions: {
            "reporterEnabled": "spec, xunit, mocha-sonarqube-file-name-reporter",//'../mocha/mocha-sonarqube-file-name-reporter'
            "specReporterOptions": {
                output: path.join(testReportDir, "mocha", "spec-results.xml"),
            },
            "xunitReporterOptions": {
                output: path.join(testReportDir, "mocha", "xunit-results.xml"),
            },
            "mochaSonarqubeFileNameReporterReporterOptions": {
                output: path.join(testReportDir, "mocha", "test-results.xml"),
                filenameFormatter: (currentPath) => {
                    let newFilePAth = path.join(process.cwd(), currentPath).replace("istanbul" + path.sep, "");
                    let exts = ["tsx", "ts", "js"];
                    if (path.extname(newFilePAth) == ".js") {
                        let originalFile = path.parse(newFilePAth);
                        originalFile.base = undefined;
                        let extIdx = 0;
                        do {
                            originalFile.ext = "." + exts[extIdx++];
                        } while (!fs.existsSync(path.format(originalFile)) && extIdx < exts.length);
                        return path.format(originalFile).replace(process.cwd() + path.sep, '');
                    }
                }
            },
            
        }
        //,"grep": "Router constructor"
    },
    istanbul: {
        dir: path.join(testWorkDir),
        reporters: ["lcov", "text", "text-summary", "cobertura", "json", "html"],
        reportOpts: {
            dir: path.join(testReportDir, "mocha"),
            lcov: { dir: path.join(testReportDir, "mocha", "lcov"), file: "lcov.info" },
            html: { dir: path.join(testReportDir, "mocha", "html") },
            json: { dir: path.join(testReportDir, "mocha"), file: "coverage_mocha.json" },
            cobertura: { dir: path.join(testReportDir, "mocha") }
        }
    },
    karma: {
        reporters: ["mocha", "coverage"],
        reportOpts: {
            dir: path.join(testReportDir, "karma"),
            lcov: { dir: path.join(testReportDir, "karma", "lcov"), file: "lcov.info" },
            html: { dir: path.join(testReportDir, "karma", "html") },
            json: { dir: path.join(testReportDir, "karma"), file: "converage_karma.json" }
        }
    }, merge: {
        reporters: ["lcov", "text", "text-summary", "cobertura", "json", "html"],
        reportOpts: {
            dir: path.join(testReportDir, "merge"),
            lcov: { dir: path.join(testReportDir, "merge", "lcov"), file: "lcov.info" },
            html: { dir: path.join(testReportDir, "merge", "html") },
            json: { dir: path.join(testReportDir, "merge"), file: "coverage.json" },
            cobertura: { dir: path.join(testReportDir, "merge") }
        }
    }, remap: {
        reporters: ["lcovonly", "text", "text-summary", "cobertura", "json", "html"],
        reportOpts: {
            dir: path.join(testReportDir, "remap"),
            lcovonly: { dir: path.join(testReportDir, "remap", "lcov"), file: "lcov.info" },
            html: { dir: path.join(testReportDir, "remap", "html") },
            json: { dir: path.join(testReportDir, "remap"), file: "coverage.json" },
            cobertura: { dir: path.join(testReportDir, "remap"), file: "cobertura-coverage.xml" }
        }

    },
    istanbulOpt: {
        includeUntested: true
    },
    webPackConfiguration: {
        module: {}
    },
    webPackMinChunks: 3,
    template: {
        context: {}
    }
};

/**
 * Fonction permettant d'enrichir l'objet de configuration
 */
function buildConf(project, conf, helper) {

    if (Array.isArray(conf.template)) {
        defaultConf.template = [];
    }

    let tscOutDir;

    if (project && project.tsConfig && project.tsConfig.compilerOptions) {
        tscOutDir = project.tsConfig.compilerOptions || {};
        tscOutDir = tscOutDir.outDir || undefined;
        defaultConf.generatedTypings.dir = tscOutDir ? tscOutDir : ".";
    }

    // Cas particulier pour conf sass: limites de la méthode merge de lodash....
    defaultConf.sassConfiguration = merge(defaultConf.sassConfiguration, conf.sassConfiguration);

    conf = lodashMerge(conf, defaultConf);

    conf.webPackConfiguration = merge(defaultConf.webPackConfiguration, conf.webpack);
    if (!conf.webPackLogAddedFiles) {
        conf.webPackLogAddedFiles = false;
    }

    conf.sourcesDTS = ["**/*.d.ts"].map(helper.prepend(conf.src));


    conf.testSourcesBase = conf.testWorkDir;
    conf.testSources = ["**/*{-spec,-test}.{js,tsx}"]
        .map(helper.prepend(path.join(conf.testSourcesBase, conf.test)));

    if (helper.getFile()) {
        if(tscOutDir) {
            conf.testSources = [path.resolve("/" + project.name, tscOutDir, helper.getFile().replace(/\.tsx?$/, ".js").replace(/^\.\//, "")).substring(project.name.length + 2)];
        } else {
            conf.testSources = [path.join(conf.testSourcesBase, helper.getFile().replace(/\.tsx?$/, ".js").replace(/^\.\//, ""))];
        }
    }

    conf.target = {};
    
    if(tscOutDir) {
        conf.target.src = path.resolve("/" + project.name, tscOutDir, conf.src).substring(project.name.length + 2);
        conf.target.test = path.resolve("/" + project.name, tscOutDir, conf.test).substring(project.name.length + 2);
        conf.target.ts = path.resolve("/" + project.name, tscOutDir).substring(project.name.length + 2);
        conf.target.base = "./" + (path.resolve("/" + project.name, tscOutDir).substring(project.name.length + 2)) + "/";
        conf.tscOutDir = "./" + (path.resolve("/" + project.name, tscOutDir).substring(project.name.length + 2));
    } else {
        conf.target.src = conf.src;
        conf.target.test = conf.test;
        conf.target.ts = "." + path.sep;
        conf.target.base = "." + path.sep;
        conf.tscOutDir = undefined;
    }

    conf.sourcesTS = flatten(["**/*.ts", "**/*.tsx"].map(helper.prepend(conf.src, conf.test))).concat("index.ts");

    var extensionsToClean = [];
    if (helper.isIDE()) {
        extensionsToClean = [];
        conf.postTSClean = [];
    } else {
        extensionsToClean = ["**/*.js*", "**/*.d.ts"].concat("index.js").concat("index.js.map");
        conf.postTSClean = flatten(["**/*.d.ts"].map(helper.prepend(conf.target.src, conf.target.test)));
    }



    conf.allSources = flatten(["**/*.*js*", "!**/*.js.map"].map(helper.prepend(conf.target.src, conf.target.test))).concat("index.js");

    // Fichiers JS à instrumenter pour la mesure de la couverture de code
    conf.instrumentableSourcesBase = conf.testSourcesBase;
    conf.instrumentableSources = ["**/*.{js,jsx}"].map(helper.prepend(path.join(conf.instrumentableSourcesBase, conf.src)));

    // Build webpack
    conf.targetClientJs = path.join(conf.target.src, conf.clientJs);

    // Gestion du clean
    conf.cleanElements =
        extensionsToClean.map(helper.prepend(conf.target.src))
            // sauf les fichiers JS "forkés", les JSX, les fichiers JSON
            .concat(["extended/*.js", "extend/*.js", "**/*.json", "**/*.jsx"].map(helper.prepend("!" + conf.target.src)));

    // Gestion du clean
    conf.cleanStaticElements = [path.join(conf.static, conf.js) + "/*.js"];
    conf.cleanStaticDllElements = [path.join(conf.static, conf.js, conf.dll)];

    conf.cleanBuildElements = [conf.buildWorkDir];
    conf.cleanTestElements = [
        conf.testWorkDir,
        conf.testReportDir,
        "karma_html"
    ]
        .concat(extensionsToClean.map(helper.prepend(conf.target.test)))
        .concat(["extended/*.js", "**/*.json", "**/*.jsx"].map(helper.prepend("!" + conf.target.test)));

    conf.cleanTemplateElements = [path.join(conf.static, conf.templateDir)];

    conf.cleanIndexElements = {
        "ts": path.resolve(project.dir, path.join(conf.generatedTypings.dir, "index.ts")),
        "js": path.resolve(project.dir, path.join(conf.generatedTypings.dir, "index.js")),
        "dts":path.resolve(project.dir, path.join(conf.generatedTypings.dir, "index.d.ts"))
    };

    conf.complementarySpaSources = ["*.json"].map(helper.prepend(path.join(conf.target.src, "resources")))
        .concat(["*.json"].map(helper.prepend(conf.config)));


    conf.istanbulOpt["coverageVariable"] = conf.istanbul["coverageVariable"] = "___" + project.name.replace(/-/g, "_") + "___";
    conf.istanbulOpt.includeUntested = true;

    // Permet d'exclure du remap les fichier sans transpilation (ex : jsx)
    conf.remap.exclude = function (filename) { return !helper.fileExists(filename) };

    helper.debug("Configuration du applicationAndModuleBuilder:", conf);

    return conf;
}
module.exports = { buildConf: buildConf };