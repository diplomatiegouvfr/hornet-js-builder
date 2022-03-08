#!/usr/bin/env node

const processDir = process.cwd();
process.title = `hornet-js-builder > ${processDir}`;

// Chargement des dépendances
const chalk = require("chalk");
const gulp = require("gulp");
const commanderGulp = require("../src/gulp/commander");
const helper = require("../src/helpers");

// Gestion de la ligne de commandes
const program = helper.getCommander();
program.parse(process.argv);
helper.initFromCommander(program);

helper.info(`
 _    _                       _       _
| |  | |                     | |     (_)     
| |__| | ___  _ __ _ __   ___| |_     _ ___  
|  __  |/ _ \\| '__| '_ \\ / _ \\ __|   | / __| 
| |  | | (_) | |  | | | |  __/ |_  _ | \\_ \\ 
|_|  |_|\\___/|_|  |_| |_|\\___|\\__|(_)| |___/ 
                                    _/ |    
                                   |__/  ${require("../package.json").version}      
                                          `);

helper.info(chalk.cyan("Démarrage de hornet-js-builder dans ", processDir));
helper.logBuilderModes();

helper.allowJSON5();

const config = {
    json: true,
    loglevel: "warn",
    progress: false,
};

helper.info(process.argv);

const project = helper.getCurrentProject();
helper.info(chalk.cyan("Builder lancé sur le projet", project.packageJson.name, "en version", project.packageJson.version));
const args = ["config", "list", "--json"];
return commanderGulp
    .toPromise({ cmd: "npm", args, cwd: helper.getMainProcessDir() }, true, false, true)
    .then((data) => {
        const npmDefaultRegistry = data && JSON.parse(data).registry;
        if (!helper.getRegistry() && !helper.getPublishRegistry()) {
            helper.info(`Utilisation du registry configuré dans NPM : ${npmDefaultRegistry}`);
        } else {
            const retrieveRegistry = helper.getRegistry() ? helper.getRegistry() : npmDefaultRegistry;
            const publishRegistry = helper.getPublishRegistry() ? helper.getPublishRegistry() : npmDefaultRegistry;
            helper.info(`Utilisation des registry : [ retrieve : ${retrieveRegistry} ; publish : ${publishRegistry}]`);
        }
        commanderGulp
        .toPromise({ cmd: "npm", args: ["--version"], cwd: helper.getMainProcessDir() }, true, false, true)
        .then((dataNpm) => {
            helper.info(`Utilisation de NPM en version : ${dataNpm.trim()}`)

        commanderGulp
        .toPromise({ cmd: "npm", args: ["list", "typescript", "--json"], cwd: helper.getMainProcessDir() }, true, false, true)
        .then((dataDependencies) => {
            const npmTypescriptDependencies = dataDependencies && JSON.parse(dataDependencies);
            let version = npmTypescriptDependencies.dependencies && npmTypescriptDependencies.dependencies["typescript"] && npmTypescriptDependencies.dependencies["typescript"].version; // version portée par le projet
            if(!version){
                version = npmTypescriptDependencies.dependencies && npmTypescriptDependencies.dependencies["hornet-js-builder"] && 
                    npmTypescriptDependencies.dependencies["hornet-js-builder"].dependencies["typescript"].version
            }
            version && helper.info(`Utilisation de typescript en version : ${version}`);
        
        // adaptation de gulp
        require("../src/extended/gulp-cli-adapter")(gulp);

        // chargement des tasks, on exécute une fois que tout est chargé
        require("../src/builders-loader")(project, function () {
            // vérification de l'existence des tâches à exécuter
            const tasks = program.args.length ? program.args : ["default"];
            helper.checkTasksExistence(gulp, tasks);
            // Exécution des tasks
            process.nextTick(function () {
                gulp.series(tasks)((err) => {
                    if (err) {
                        process.exit(1);
                    }
                    process.exit(0);
                });
            });
        });
    })
    })
    })
    .catch((err) => {
        helper.error("erreur :", err);
        process.exit(1);
    });
