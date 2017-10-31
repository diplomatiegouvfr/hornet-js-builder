"use strict";

var _ = require("lodash");
var YAML = require('yamljs');

var Docker = function () {
};


Docker.DOCKER_COMPOSE = "docker-compose";
Docker.DOCKER = "docker";

/**
 * Command execution passed in parameter.
 * The command must be a valide docker-compose command.
 *
 * @param cmd Command to execute
 * @param opts Options to pass to the command (optional)
 * @param service Specify service if needed (optional)
 */
function executeCommandCompose(cmd, opts, service) {
    console.log('                    ##        .            ');
    console.log('              ## ## ##       ==            ');
    console.log('           ## ## ## ##      ===            ');
    console.log('       /""""""""""""""""\\\___/ ===        ');
    console.log('  ~~~ {~~ ~~~~ ~~~ ~~~~ ~~ ~ /  ===- ~~~   ');
    console.log('       \\\______ o          __/            ');
    console.log('         \\\    \\\        __/             ');
    console.log('          \\\____\\\______/                ');


    var commandLine = buildCommandLineCompose(cmd, opts, service);
    console.time("Executing Docker's command " + commandLine);
    const execSync = require('child_process').execSync;
    execSync(commandLine, {stdio: [0, 1, 2]});
    console.log("");
    console.timeEnd("Executing Docker's command " + commandLine);
}


/**
 * Command execution passed in parameter.
 * The command must be a valide docker-compose command.
 *
 * @param cmd Command to execute
 * @param opts Options to pass to the command (optional)
 * @param service Specify service if needed (optional)
 */
function executeCommand(cmd, opts) {
    console.log('                    ##        .            ');
    console.log('              ## ## ##       ==            ');
    console.log('           ## ## ## ##      ===            ');
    console.log('       /""""""""""""""""\\\___/ ===        ');
    console.log('  ~~~ {~~ ~~~~ ~~~ ~~~~ ~~ ~ /  ===- ~~~   ');
    console.log('       \\\______ o          __/            ');
    console.log('         \\\    \\\        __/             ');
    console.log('          \\\____\\\______/                ');


    var commandLine = buildCommandLine(cmd, opts);
    console.time("Executing Docker's command " + commandLine);
    const execSync = require('child_process').execSync;
    execSync(commandLine, {stdio: [0, 1, 2]});
    console.log("");
    console.timeEnd("Executing Docker's command " + commandLine);
}

/**
 * Build the string that represents the command line to execute.
 * If command is undefined, log and error.
 *
 * @param cmd Command to execute
 * @param opts Options to pass to the command (optional)
 * @param service Specify service if needed (optional)
 * @returns {string} The String representation of the command line to execute
 */
function buildCommandLineCompose(cmd, opts, service) {
    if (_.isUndefined(cmd) || cmd == null) {
        console.error("Please specify a command to run for all or one of theses services : ")
        cmd = "ps";
        opts = "";
        service = ""
    }

    if (_.isUndefined(opts) || opts == null) {
        opts = "";
    }

    if (_.isUndefined(service) || service == null) {
        service = "";
    }

    return Docker.DOCKER_COMPOSE + " " + cmd + " " + opts + " " + service;
}

/**
 * Build the string that represents the command line to execute.
 * If command is undefined, log and error.
 *
 * @param cmd Command to execute
 * @param opts Options to pass to the command (optional)
 * @returns {string} The String representation of the command line to execute
 */
function buildCommandLine(cmd, opts) {
    if (_.isUndefined(cmd) || cmd == null) {
        console.error("Please specify a command to run for all or one of theses services : ")
        cmd = "ps";
        opts = "";
    }

    if (_.isUndefined(opts) || opts == null) {
        opts = "";
    }

    return Docker.DOCKER + " " + cmd + " " + opts;
}


/**
 * Set all arguments passed in command line option --docker
 *
 * @param opts true if only --docker. Otherwise, an object with optional attributes cmd, options and service.
 */

var options = {};
function setOptions (opts) {
    options = opts;
}
exports.setOptions = setOptions;

/**
 * Build services defined in the docker-compose file.
 * @param opts Options to pass to the docker-compose build command (optional)
 * @param service Service to build (optional)
 */
function build (opts, service) {
    if (_.isUndefined(opts))
        opts = "--no-cache --force-rm";

    executeCommandCompose("build", opts, service);
}
exports.build = build;


/**
 * Push services defined in the docker-compose file.
 * @param opts Options to pass to the docker-compose build command (optional)
 * @param service Service to build (optional)
 */
function publish(registry, service) {

    // First, search the image associated with the service
    // and re TAG it with prefix that must be the target repository
    var compose = YAML.load('docker-compose.yml');

    if (_.isUndefined(service)) {
        var services = compose.services;
        Object.getOwnPropertyNames(services).forEach(function(val, idx, array) {
            publishService(compose, val, registry);
        });
    }
    else {
        publishService(compose, service, registry);
    }

}

function publishService(compose, service, registry) {
    var imageName = compose.services[service].image;
    var newImageName = "docker-integration-dev.artifactory/" + imageName;

    if (!_.isUndefined(registry)) {
        newImageName = registry + "/" + imageName;
    }
    executeCommand("tag " + imageName + " " + newImageName, undefined);
    executeCommand("push " + newImageName, undefined);
}
exports.publish = publish;

/**
 * Execute services defined in the docker-compose file.
 * @param opts Options to pass to the docker-compose build command (optional)
 * @param service service Service to build (optional)
 * @param runCommand The command to run as the entrypoint to override
 */
function run (opts, service, runCommand) {
    if (_.isUndefined(opts))
        opts = " --service-ports";
    if (!_.isUndefined(runCommand))
        opts += " --entrypoint " + runCommand
    executeCommandCompose("run", opts, service);
};
exports.run = run;

/**
 * Create and start services defined in the docker-compose file.
 * @param opts Options to pass to the docker-compose build command (optional)
 * @param service Service to build (optional)
 */
function up (opts, service) {
    if (_.isUndefined(opts))
        opts = "-d --force-recreate -t 1 --remove-orphans";

    executeCommandCompose("up", opts, service);
}
exports.up = up;



/**
 * Remove services defined in the docker-compose file.
 * @param opts Options to pass to the docker-compose build command (optional)
 * @param service Service to build (optional)
 */
function rm (opts, service) {
    if (_.isUndefined(opts))
        opts = "-f -a";

    executeCommandCompose("rm", opts, service);
}
exports.remove = rm;

/**
 * Remove services defined in the docker-compose file.
 * @param opts Options to pass to the docker-compose build command (optional)
 */
function down (opts, service) {
    if (_.isUndefined(opts))
        opts = "--remove-orphans";

    executeCommandCompose("down", opts, service);
}
exports.down = down;

/**
 * Stop services defined in the docker-compose file.
 * @param opts Options to pass to the docker-compose build command (optional)
 * @param service Service to build (optional)
 */
function stop (opts, service) {
    if (_.isUndefined(opts))
        opts = "-t 1";

    executeCommandCompose("stop", opts, service);
}
exports.stop = stop;

/**
 * Launch all the application in watch mode for automatic reloading
 * @param opts Options to pass to the docker-compose build command (optional)
 */
function watch(opts, commandArgs, watch, service) {
    if(_.isUndefined(service)){
        service = "web";
    }
    rm(opts, undefined);
    up(opts, service);
    stop(opts, service);

    // Parse la command pour l'adapter au contexte du container (chemins, options -D ou --docker à supprimer)
    var commandLine = "\"node /var/lib/nodejs/builder/bin/builder-cli.js " + watch;
    var isDockerOption = false;
    for (var i=3; i<commandArgs.length; i++) {
        if (commandArgs[i] == "-D" ||  commandArgs[i] == "--docker") {
            isDockerOption = true;
            continue;
        }

        if (isDockerOption && commandArgs[i].startsWith("-")) {
            isDockerOption = false;
        }

        if (!isDockerOption) {
            commandLine += " " + commandArgs[i];
        }
    }
    commandLine += "\"";

    var workingDir = process.cwd();
    opts= "-w " + workingDir + " --service-ports";
    run(opts, service, commandLine);
}
exports.watch = watch;watch