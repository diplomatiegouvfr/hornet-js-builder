const path = require('path');

/**
 *
 * @param project {object}
 * @returns {function(config)}
 */
const getKarmaConf = (project) => {
    /**
     * @param config {Object} karma object
     */
    return function (config) {
        config.set({
            basePath: project.dir,
            browsers: ["Chrome", "Firefox"],
            port: 9876,
            colors: true,
            singleRun: false,
            // level of logging
            // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
            logLevel: config.LOG_INFO,
            plugins: [
                'karma-jquery',
                'karma-mocha',
                'karma-chrome-launcher',
                'karma-firefox-launcher',
                'karma-junit-reporter',
                'karma-mocha-reporter',
                'karma-html-reporter',
                'karma-coverage',
                'karma-sourcemap-loader',
                'karma-webpack',
                'karma-commonjs'
            ],
            frameworks: ['mocha', 'jquery-1.8.3'],
            files: [
                'test/**/*.karma.ts',
                'test/**/*.karma.tsx'
            ],
            // list of files to exclude
            exclude: [],
            preprocessors: {
                'src/**/*.js': ['webpack', 'sourcemap'],
                'test/**/*.js': ['webpack', 'sourcemap']
            },
            // test results reporter to use
            // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
            reporters: ['mocha', 'junit', 'coverage', 'html'],
            junitReporter: {
                outputFile: 'site/test-results.xml',
                suite: ''
            },
            htmlReporter: {
                outputDir: 'site', // where to put the reports
                templatePath: null, // set if you moved jasmine_template.html
                focusOnFailures: false, // reports show failures on start
                urlFriendlyName: true, // simply replaces spaces with _ for files/dirs
                reportName: 'report', // report summary filename; browser info by default
                // experimental
                preserveDescribeNesting: true, // folded suites stay folded
                foldAll: false, // reports start folded (only with preserveDescribeNesting)
            },
            // reporter options
            mochaReporter: {
                output: 'full'
            },
            coverageReporter: {
                dir: "site/coverage",
                reporters: [
                    {
                        type: "html",
                        subdir: '.'
                    },
                    {
                        type: "cobertura",
                        subdir: '.'
                    },
                ]
            },
            webpack: {}
        });
    };
};

module.exports = getKarmaConf;