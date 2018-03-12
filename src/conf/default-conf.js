"use strict";

const path = require("path");
const _ = require("lodash");
const merge = require('webpack-merge');

const testReportDir = "test_report";
const testWorkDir = "istanbul";
const defaultConf = {
    src: "src",
    test: "test",
    static: "static",
    database: "database",
    environment: {
        dir: "environment",
        configuration: "environment/configuration",
        templates:"environment/templates"
    },   
    testEnvironment: {
        dir: "test-environment",
        configuration: "test-environment/configuration",
        templates:"test-environment/templates"
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
        reporter: process.env.NODE_ENV === "integration" ? "xunit" : "spec",
        reporterOptions: {
            output: "test-results.xml"
        }
        //,"grep": "Router constructor"
    },
    istanbul: {
        dir: path.join(testWorkDir, "coverage"),
        reporters: ["lcov", "text", "text-summary", "cobertura", "json", "html"],
        reportOpts: {
            dir: path.join(testReportDir, "mocha"),
            lcov: {dir: path.join(testReportDir, "mocha", "lcov"), file: "lcov.info"},
            html: {dir: path.join(testReportDir, "mocha", "html")},
            json: {dir: path.join(testReportDir, "mocha"), file: "coverage_mocha.json"},
            cobertura: {dir: path.join(testReportDir, "mocha")}
        }
    },
    karma: {
        reporters: ["mocha", "coverage"],
        reportOpts: {
            dir: path.join(testReportDir, "karma"),
            lcov: {dir: path.join(testReportDir, "karma", "lcov"), file: "lcov.info"},
            html: {dir: path.join(testReportDir, "karma", "html")},
            json: {dir: path.join(testReportDir, "karma"), file: "converage_karma.json"}
        }
    },merge: {
        reporters: ["lcov", "text", "text-summary", "cobertura", "json", "html"],
        reportOpts: {
            dir: path.join(testReportDir, "merge"),
            lcov: {dir: path.join(testReportDir, "merge", "lcov"), file: "lcov.info"},
            html: {dir: path.join(testReportDir, "merge", "html")},
            json: {dir: path.join(testReportDir, "merge"), file: "coverage.json"},
            cobertura: {dir: path.join(testReportDir, "merge")}
        }
    },remap: {
        inputReport: {dir: path.join(testReportDir, "merge"), file: "coverage_mocha.json"},
        reporters: ["lcovonly", "text", "text-summary", "cobertura", "json", "html"],
        reportOpts: {
            dir: path.join(testReportDir, "remap"),
            lcovonly: {dir: path.join(testReportDir, "remap", "lcov"), file: "lcov.info"},
            html: {dir: path.join(testReportDir, "remap", "html"), file: ""},
            json: {dir: path.join(testReportDir, "remap"), file: "coverage_mocha.json"},
            cobertura: {dir: path.join(testReportDir, "remap"), file: "cobertura-coverage.xml"},
            text: {dir: path.join(testReportDir, "remap"), file: "coverage_remap.txt"}
        }
    },remap: {
        reporters: ["lcovonly", "text", "text-summary", "cobertura", "json", "html"],
        reportOpts: {
            dir: path.join(testReportDir, "remap"),
            lcovonly: {dir: path.join(testReportDir, "remap", "lcov"), file: "lcov.info"},
            html: {dir: path.join(testReportDir, "remap", "html")},
            json: {dir: path.join(testReportDir, "remap"), file: "coverage.json"},
            cobertura: {dir: path.join(testReportDir, "remap"), file: "cobertura-coverage.xml"},
            text: {dir: path.join(testReportDir, "remap"), file: "coverage.txt"},
            "text-summary": {dir: path.join(testReportDir, "remap"), file: "coverage_summary.txt"}
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

    if (_.isArray(conf.template)) {
        defaultConf.template = [];
    }

    conf = _.merge(conf, defaultConf);

    conf.webPackConfiguration = merge(defaultConf.webPackConfiguration, conf.webpack);
    if (!conf.webPackLogAddedFiles) {
        conf.webPackLogAddedFiles = false;
    }

    conf.sourcesDTS = ["**/*.d.ts"].map(prepend(conf.src));

    var sourcesAndTestsDts = _.flatten(["**/*.d.ts"].map(prepend(conf.src, conf.test)));

    conf.sourcesTS = _.flatten(["**/*.ts", "**/*.tsx"].map(prepend(conf.src, conf.test))).concat("index.ts");
    conf.targetTS = "." + path.sep;

    var extensionsToClean = [];
    if (helper.isIDE()) {
        extensionsToClean = [];
        conf.postTSClean = [];
    } else {
        extensionsToClean = ["**/*.js*", "**/*.d.ts"].concat("index.js").concat("index.js.map");
        conf.postTSClean = sourcesAndTestsDts;
    }

    conf.testSourcesBase = conf.testWorkDir;
    conf.testSources = ["**/*{-spec,-test}.{js,tsx}"]
        .map(prepend(path.join(conf.testSourcesBase, conf.test)));

    conf.allSources = _.flatten(["**/*.*js*", "!**/*.js.map"].map(prepend(conf.src, conf.test))).concat("index.js");

    // Fichiers JS à instrumenter pour la mesure de la couverture de code
    conf.instrumentableSourcesBase = conf.testSourcesBase;
    conf.instrumentableSources = ["**/*.{js,jsx}"].map(prepend(path.join(conf.instrumentableSourcesBase, conf.src)));

    // Build webpack
    conf.targetClientJs = path.join(conf.src, conf.clientJs);

    // Gestion du clean
    conf.cleanElements =
        extensionsToClean.map(prepend(conf.src))
            // sauf les fichiers JS "forkés", les JSX, les fichiers JSON
            .concat(["extended/*.js", "**/*.json", "**/*.jsx"].map(prepend("!" + conf.src)));

    // Gestion du clean
    conf.cleanStaticElements = [path.join(conf.static, conf.js) + "/*.js"];
    conf.cleanStaticDllElements = [path.join(conf.static, conf.js, conf.dll)];

    conf.cleanThemeElements = []
    if(project.configJson["themeName"]){
        conf.cleanThemeElements.push(path.join(conf.static, project.configJson["themeName"]));
    }

    conf.cleanBuildElements = [conf.buildWorkDir];
    conf.cleanTestElements = [
        conf.testWorkDir,
        conf.testReportDir,
        "karma_html"
    ]
        .concat(extensionsToClean.map(prepend(conf.test)))
        .concat(["extended/*.js", "**/*.json", "**/*.jsx"].map(prepend("!" + conf.test)));

    conf.cleanTemplateElements = [path.join(conf.static, conf.templateDir)];

    conf.complementarySpaSources = ["*.json"].map(prepend(path.join(conf.src, "resources")))
        .concat(["*.json"].map(prepend(conf.config)));


    conf.istanbulOpt["coverageVariable"] = conf.istanbul["coverageVariable"] = "___" + project.name.replace(/-/g, "_") + "___";
    conf.istanbulOpt.includeUntested = true;

    helper.debug("Configuration du applicationAndModuleBuilder:", conf);

    return conf;
}

/**
 * Fonction retournant une fonction de mapping ajoutant les arguments avant ceux du tableau sur lequel s'applique le mapping
 * @param ...args les arguments à ajouter
 * @returns {Function}
 */
function prepend() {
    var args = Array.prototype.slice.call(arguments, 0);
    return function (element) {
        if (args.length === 1) {
            if (args[0] === "!") {
                return args[0] + element;
            } else {
                return path.join(args[0], element);
            }
        } else {
            return args.map(function (argElement) {
                return path.join(argElement, element);
            });
        }
    };
}

module.exports = {buildConf: buildConf};