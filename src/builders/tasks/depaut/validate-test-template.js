"use strict";

const path = require("path");
const ValidateJson = require("./../validate/validate-json");

class ValidateTestTemplate extends ValidateJson {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project, path.join(conf.buildWorkDir, conf.testEnvironment.templates) + "**/*");
    }
}


module.exports = ValidateTestTemplate;
