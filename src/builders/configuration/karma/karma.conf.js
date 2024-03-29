const fs = require("fs");
const path = require("path");
const { constants } = require("karma");

/**
 *
 * @param project {object}
 * @returns {function(config)}
 */
const getKarmaConf = function (project, helper, conf, defaultTestsFileName) {
    /**
     * @param config {Object} karma object
     */
    return {
        basePath: project.dir,
        files: [
            (helper.getFile() && path.join(conf.tscOutDir || "", helper.getFile().replace(/\.tsx?$/, ".js"))) || defaultTestsFileName, // , "src/**/*.js" pour rapport à vide
            { pattern: path.join(conf.target.src, "**/*.js"), included: false, served: false },
        ],
        browsers: ["Firefox"], // ["PhantomJS"],
        port: 9876,
        colors: true,
        singleRun: !(helper.isDebug() || helper.getFile()),
        autoWatch: !!helper.getFile(),
        autoWatchBatchDelay: 1000,
        customLaunchers: {
            FirefoxHeadless: {
                base: "Firefox",
                flags: ["-headless"],
            },
            SeleniumFirefox: {
                base: "SeleniumGrid",
                gridUrl: process.env.SELENIUM_GRID_URL,
                browserName: "firefox",
                desiredCapabilities: {
                    firefoxOptions: {
                        args: ["-headless"],
                    },
                },
                heartbeatInterval: 10000,
            },
        },
        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: constants.LOG_WARN,
        plugins: [
            "karma-mocha",
            "karma-chrome-launcher",
            "karma-firefox-launcher",
            "karma-ie-launcher",
            "karma-junit-reporter",
            "karma-mocha-reporter",
            "karma-coverage",
            "karma-sourcemap-loader",
            "karma-webpack",
            "karma-commonjs",
        ],
        frameworks: ["mocha"],
        client: {
            captureConsole: true,
            mocha: {
                allowUncaught: true,
                opts: path.join(project.dir, "test", "mocha.opts"),
            },
        },
        preprocessors: {
            "*.js": ["webpack", "sourcemap"],
        },
        // list of files to exclude
        exclude: [],
        // test results reporter to use
        // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
        reporters: ["mocha", "coverage", "junit"], // reporters: ["mocha", "coverage", "html", "junit"],
        sonarQubeUnitReporter: {
            sonarQubeVersion: "LATEST",
            outputFile: path.join("./", conf.testReportDir, "/karma/test-sonar-results.xml"),
            useBrowserName: false,
            filenameFormatter: (currentPath) => {
                const newFilePAth = path.join(process.cwd(), currentPath.split(/\s/)[0]);
                const exts = ["tsx", "ts", "js"];
                if (path.extname(newFilePAth) == ".js") {
                    const originalFile = path.parse(newFilePAth);
                    originalFile.base = undefined;
                    let extIdx = 0;
                    do {
                        originalFile.ext = `.${exts[extIdx++]}`;
                    } while (!fs.existsSync(path.format(originalFile)) && extIdx < exts.length);
                    return path.format(originalFile).replace(process.cwd() + path.sep, "") || currentPath;
                }
                return currentPath;
            },
            testnameFormatter: (testname, result) => {
                return result.description || testname;
            },
        },
        junitReporter: {
            outputDir: path.join("./", conf.testReportDir, "/karma/junit"),
        },
        coverageReporter: {
            instrumenterOptions: {
                istanbul: conf.istanbul.instrumenter,
            },
            include: path.join(conf.target.src, "**/*.js"),
            dir: `./${conf.testReportDir}/karma`,
            // includeAllSources: true,
            reporters: [
                {
                    type: "html",
                    subdir: "./html",
                },
                {
                    type: "cobertura",
                    subdir: ".",
                },
                {
                    type: "json",
                    subdir: ".",
                    file: "coverage_karma.json",
                },
                {
                    type: "lcov",
                    subdir: "./lcov",
                    file: "lcov.info",
                },
                {
                    type: "text",
                },
            ],
        },
        webpack: {
            devtool: "inline-source-map",
        },
        webpackMiddleware: {
            // webpack-dev-middleware configuration
            stats: "errors-only",
        },
    };
};

module.exports = getKarmaConf;
