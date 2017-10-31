"use strict";

const Task = require("./../task");
const Utils = require("../utils");
const npm = require("npm");
const zip = require("gulp-zip");
const spawn = require('child_process').spawn;
        	

/**
 * Fonction générique de recopie de fichiers vers le repertoire de destination
 */
class ValidateTemplate extends Task {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);

        this.templateBaseDir = path.join('./environment');
        this.templateTestDir = path.join('./target/test-environment');
        this.templateTestEnv = 'NIGHTLY';

        this.shell = '/bin/bash';
        this.scriptPath = path.join('./builder-tools/template-validator.sh');
    }

    task(gulp, helper, conf, project) {
        return (done) => {

        	var cmd = spawn(shell, [scriptPath, baseDir, targetDir, envId], {stdio: 'inherit'});
 
        	cmd.on('close', function (code) {
        		helper.debug('[template-validator] Exit code ' + code);
            	done(code);
        	});
         }
    }
}

module.exports = ValidateTemplate;
