const path = require("path");
const flatten = require("lodash.flatten");
const lodashMerge = require("lodash.merge");
const merge = require("webpack-merge");

const staticDir = "static";
const testReportDir = "test_report";
const testWorkDir = "istanbul";

const defaultConf = {
    src: "src",
    test: "test",
    static: staticDir,
    header: {},
    database: "database",
    environment: {
        dir: "environment",
        configuration: "environment/configuration",
        templates: "environment/templates",
    },
    testEnvironment: {
        dir: "test-environment",
        configuration: "test-environment/configuration",
        templates: "test-environment/templates",
    },
    js: "js",
    css: "css",
    dll: "dll",
    config: "./config",
    generatedTypings: {
        dir: ".",
        file: "definition.d.ts",
    },
    clientJs: "client.js",
    routesDirs: [`.${path.sep}routes`],
    componentsDirs: [path.join("..", "src")],
    buildWorkDir: "target",
    testReportDir,
    testWorkDir,
    templateDir: "html",
    mocha: {
        preserveSymlinks: true,
        _: ["--reporter", "mocha-junit-reporter"],
        extendsOpts: { reporterOption: { mochaFile: `.${path.sep}${path.join(testReportDir, "mocha_junit.xml")}` } },
    },
    istanbul: {
        coverageVariable: "__coverage__",
        dir: path.join(testReportDir),
        reporters: ["lcov", "text", "text-summary", "cobertura", "json", "html"],
        reportOpts: {
            dir: path.join(testReportDir, "mocha"),
            lcov: { dir: path.join(testReportDir, "mocha", "lcov"), file: "lcov.info" },
            html: { dir: path.join(testReportDir, "mocha", "html") },
            json: { dir: path.join(testReportDir, "mocha"), file: "coverage_mocha.json" },
            cobertura: { dir: path.join(testReportDir, "mocha") },
        },
        instrumenter: {
            includeUntested: true,
            preserveComments: true,
            noCompact: true,
            all: true,
            include: ["src/**/*.js"],
            exclude: ["node_modules/**/*"],
            inPlace: true,
            sourceMap: true,
        },
    },
    karma: {
        reporters: ["mocha", "coverage"],
        reportOpts: {
            dir: path.join(testReportDir, "karma"),
            lcov: { dir: path.join(testReportDir, "karma", "lcov"), file: "lcov.info" },
            html: { dir: path.join(testReportDir, "karma", "html") },
            json: { dir: path.join(testReportDir, "karma"), file: "converage_karma.json" },
        },
    },
    merge: {
        reporters: ["lcov", "text", "text-summary", "cobertura", "json", "html"],
        reportOpts: {
            dir: path.join(testReportDir, "merge"),
            lcov: { dir: path.join(testReportDir, "merge", "lcov"), file: "lcov.info" },
            html: { dir: path.join(testReportDir, "merge", "html") },
            json: { dir: path.join(testReportDir, "merge"), file: "coverage.json" },
            cobertura: { dir: path.join(testReportDir, "merge") },
        },
    },
    remap: {
        reporters: ["lcovonly", "text", "text-summary", "cobertura", "json", "html"],
        reportOpts: {
            dir: path.join(testReportDir, "remap"),
            lcovonly: { dir: path.join(testReportDir, "remap", "lcov"), file: "lcov.info" },
            html: { dir: path.join(testReportDir, "remap", "html") },
            json: { dir: path.join(testReportDir, "remap"), file: "coverage.json" },
            cobertura: { dir: path.join(testReportDir, "remap"), file: "cobertura-coverage.xml" },
        },
    },
    webPackConfiguration: {
        module: {},
    },
    webPackMinChunks: 3,
    template: {
        context: {},
    },
    prepare: {
        compile: {
            othersFilesToCopy: [],
            sourceMapsOption: {},
        },
        publish: {
            outDir: "tmpPublish",
            othersFilesToCopy: [
                "**/*",
                "!definition-ts",
                "!definition-ts/**/*",
                "!node_modules/**/*",
                "!node_modules",
                "!**/*.tsx",
                "!**/*.ts",
                "!*.js",
                "!*.js.map",
                "!builder.js",
                "!.builder.js",
                "!tsconfig.json",
                "!tests.webpack.js",
            ],
        },
    },
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
        defaultConf.generatedTypings.dir = tscOutDir || ".";
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
    conf.testSources = ["**/*{-spec,-test}.{js,tsx}"].map(helper.prepend(path.join(conf.testSourcesBase, conf.test)));

    if (helper.getFile()) {
        if (tscOutDir) {
            conf.testSources = [
                path
                    .resolve(
                        `/${project.name}`,
                        tscOutDir,
                        helper
                            .getFile()
                            .replace(/\.tsx?$/, ".js")
                            .replace(/^\.\//, ""),
                    )
                    .substring(project.name.length + 2),
            ];
        } else {
            conf.testSources = [
                path.join(
                    conf.testSourcesBase,
                    helper
                        .getFile()
                        .replace(/\.tsx?$/, ".js")
                        .replace(/^\.\//, ""),
                ),
            ];
        }
    }

    conf.target = {};

    if (tscOutDir) {
        conf.target.src = path.resolve(project.dir, tscOutDir, conf.src).substring(project.dir.length + path.sep.length);
        conf.target.test = path.resolve(project.dir, tscOutDir, conf.test).substring(project.dir.length + path.sep.length);
        conf.target.ts = path.resolve(project.dir, tscOutDir).substring(project.dir.length + path.sep.length);
        conf.target.base = `.${path.sep}${path.resolve(project.dir, tscOutDir).substring(project.dir.length + path.sep.length)}${path.sep}`;
        conf.tscOutDir = `.${path.sep}${path.resolve(project.dir, tscOutDir).substring(project.dir.length + path.sep.length)}`;
    } else {
        conf.target.src = conf.src;
        conf.target.test = conf.test;
        conf.target.ts = `.${path.sep}`;
        conf.target.base = `.${path.sep}`;
        conf.tscOutDir = undefined;
    }
    conf.sourcesTS = flatten(["**/*.ts", "**/*.tsx"].map(helper.prepend(conf.src, conf.test))).concat("index.ts");

    let extensionsToClean = [];
    if (helper.isIDE()) {
        extensionsToClean = [];
        conf.postTSClean = [];
    } else {
        extensionsToClean = ["**/*.js*", "**/*.d.ts"].concat("index.js").concat("index.js.map");
        conf.postTSClean = flatten(["**/*.d.ts"].map(helper.prepend(conf.target.src, conf.target.test)));
    }

    conf.allSources = flatten(["**/*.*js*", "**/*.js.map"].map(helper.prepend(conf.target.src, conf.target.test))).concat("index.js");
    conf.allOtherResources = flatten(["**/*", "!**/*.*js*", "!**/*.js.map", "!**/*.d.ts"].map(helper.prepend(conf.target.src, conf.target.test))).concat("!index.js");

    // Fichiers JS à instrumenter pour la mesure de la couverture de code
    conf.instrumentableSourcesBase = conf.testSourcesBase;
    conf.instrumentableSources = ["**/*.{js,jsx}"].map(helper.prepend(path.join(conf.instrumentableSourcesBase, conf.src)));
    conf.istanbul.instrumenter.include = conf.instrumentableSources;

    conf.istanbul = {
        ...conf.istanbul,
        ...{
            dir: path.join(project.dir, testReportDir),
            reporters: ["lcov", "text", "text-summary", "cobertura", "json", "html"],
            reportOpts: {
                dir: path.join(project.dir, testReportDir, "mocha"),
                lcov: { dir: path.join(project.dir, testReportDir, "mocha", "lcov"), file: "lcov.info" },
                html: { dir: path.join(project.dir, testReportDir, "mocha", "html") },
                json: { dir: path.join(project.dir, testReportDir, "mocha"), file: "coverage_mocha.json" },
                cobertura: { dir: path.join(project.dir, testReportDir, "mocha") },
            },
        },
    };

    conf.merge = {
        reporters: ["lcov", "text", "text-summary", "cobertura", "json", "html"],
        reportOpts: {
            dir: path.join(project.dir, testReportDir, "merge"),
            lcov: { dir: path.join(project.dir, testReportDir, "merge", "lcov"), file: "lcov.info" },
            html: { dir: path.join(project.dir, testReportDir, "merge", "html") },
            json: { dir: path.join(project.dir, testReportDir, "merge"), file: "coverage.json" },
            cobertura: { dir: path.join(project.dir, testReportDir, "merge") },
        },
    };

    conf.remap = {
        reporters: ["lcovonly", "text", "text-summary", "cobertura", "json", "html"],
        reportOpts: {
            dir: path.join(project.dir, testReportDir, "remap"),
            lcovonly: { dir: path.join(path.relative(process.cwd(), project.dir), testReportDir, "remap", "lcov"), file: "lcov.info" },
            html: { dir: path.join(path.relative(process.cwd(), project.dir), testReportDir, "remap", "html") },
            json: { dir: path.join(path.relative(process.cwd(), project.dir), testReportDir, "remap"), file: "coverage.json" },
            cobertura: { dir: path.join(path.relative(process.cwd(), project.dir), testReportDir, "remap"), file: "cobertura-coverage.xml" },
        },
    };

    // Build webpack
    conf.targetClientJs = path.join(conf.src, conf.clientJs);

    // Gestion du clean

    if (tscOutDir) {
        conf.cleanElements = [path.join(project.dir, tscOutDir)];
    } else {
        conf.cleanElements = extensionsToClean
            .map(helper.prepend(conf.target.src))
            // sauf les fichiers JS "forkés", les JSX, les fichiers JSON
            .concat(["extended/*.js", "extend/*.js", "**/*.json", "**/*.jsx"].map(helper.prepend(`!${conf.target.src}`)));
    }

    // Gestion du clean
    conf.cleanStaticElements = [`${path.join(tscOutDir || "", conf.static, conf.js)}/*.js`];
    conf.cleanStaticDllElements = [path.join(tscOutDir || "", conf.static, conf.js, conf.dll)];

    conf.cleanBuildElements = [path.join(project.dir, conf.buildWorkDir)];
    conf.cleanTestElements = [path.join(project.dir, conf.testWorkDir), path.join(project.dir, conf.testReportDir), path.join(project.dir, "karma_html")]
        .concat(extensionsToClean.map(helper.prepend(conf.target.test)))
        .concat(["extended/*.js", "**/*.json", "**/*.jsx"].map(helper.prepend(`!${conf.target.test}`)));

    conf.cleanTemplateElements = [path.join(tscOutDir || "", conf.static, conf.templateDir)];

    conf.cleanIndexElements = {
        ts: path.resolve(project.dir, path.join(conf.generatedTypings.dir, "index.ts")),
        js: path.resolve(project.dir, path.join(conf.generatedTypings.dir, "index.js")),
        dts: path.resolve(project.dir, path.join(conf.generatedTypings.dir, "index.d.ts")),
    };

    conf.complementarySpaSources = ["*.json"].map(helper.prepend(path.join(conf.target.src, "resources"))).concat(["*.json"].map(helper.prepend(conf.config)));

    // Permet d'exclure du remap les fichier sans transpilation (ex : jsx)
    conf.remap.exclude = function (filename) {
        return !helper.fileExists(filename);
    };

    conf.prepare = {
        compile: {
            othersFilesToCopy: [
                path.join(".", conf.src, "**", "*"),
                path.join(".", conf.test, "**", "*"),
                path.join(".", conf.static, "**", "*"),
                path.join(`!${conf.src}`, "**/*.ts"),
                path.join(`!${conf.src}`, "**/*.tsx"),
                path.join(`!${conf.test}`, "**/*.ts"),
                path.join(`!${conf.test}`, "**/*.tsx"),
                ...conf.prepare.compile.othersFilesToCopy,
            ],
        },
        publish: {
            filesToCopy: [
                ...["*.js", "*.d.ts"].map(helper.prepend(conf.target.ts)),
                ...[path.join(".", conf.src, "**", "*")].map(helper.prepend(conf.target.ts)),
                ...[path.join(`${conf.src}`, "**/*.ts*")].map(helper.prepend(`!${conf.target.ts}`)),
                ...[conf.test, `${conf.test}/**/*`].map(helper.prepend(`!${conf.target.ts}`)),
                `!${conf.prepare.publish.outDir}`,
                `!${conf.prepare.publish.outDir}/**/*`,
                "!builder.js",
                "!.builder.js",
                "package.json",
            ],
            othersFilesToCopy: [
                "*",
                "**/*",
                `!${conf.prepare.publish.outDir}`,
                `!${conf.prepare.publish.outDir}/**/*`,
                "!.*/*",
                "!.*/**/*",
                "!definition-ts",
                "!definition-ts/**/*",
                "!node_modules/**/*",
                "!node_modules",
                "!tmp/**/*",
                "!tmp",
                `!${conf.generatedTypings.dir}`,
                `!${conf.generatedTypings.dir}/**/*`,
                "!**/*.tsx",
                "!**/*.ts",
                "!*.js",
                "!*.js.map",
                `!${conf.test}`,
                `!${conf.test}/**/*`,
                `!${conf.testReportDir}`,
                `!${conf.testReportDir}/**/*`,
                `!${conf.testWorkDir}`,
                `!${conf.testWorkDir}/**/*`,
                `!${conf.environment.dir}`,
                `!${conf.environment.dir}/**/*`,
                `!${conf.buildWorkDir}`,
                `!${conf.buildWorkDir}/**/*`,
                `!${conf.template.dir || `${project.dir}/template`}`,
                `!${conf.template.dir || `${project.dir}/template`}/**/*`,
                "!*.env",
                "!*.cert",
                "!*.pem",
                "!builder.js",
                "!.builder.js",
                "!tsconfig.json",
                "!tests.webpack.js",
                "!*.properties",
                "!package-lock.json",
                "!.jfrog",
                "!.npm-cache",
                "!.nyc_out.json",
                ".npmignore",
                ".gitignore",
                ".svnignore",
            ],
            outDir: path.join(project.dir, conf.prepare.publish.outDir),
        },
    };

    helper.debug("Configuration du applicationAndModuleBuilder:", conf);

    return conf;
}
module.exports = { buildConf };
