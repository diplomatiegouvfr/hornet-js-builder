"use strict";

const State = require("./../state");
const Helper = require("./../../helpers");
const chalk = require("chalk");
var prettyTime = require("pretty-hrtime");

var taskList = [];

class Task {
    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project, task) {

        this.name = name;
        this.taskDepend = taskDepend;
        this.taskDependencies = taskDependencies;
        this.project = project;

        // Gestion du resolving des modules issus du parent
        if(project && (!State.externalDependencies || !State.externalDependencies[project.name])) {
            State.externalDependencies[project.name] = {};
            if((project.builderJs.externalModules && project.builderJs.externalModules.enabled) || (State.parentBuilder.externalModules && State.parentBuilder.externalModules.enabled) || helper.isActiveExternal() /*|| !helper.isMultiType()*/) { 
                helper.getExternalModules(project).forEach(function (mod) {
                    State.externalDependencies[project.name][mod.name] = mod;
                    helper.info("Auto resolving module externe '" + mod.name + "@" + mod.version + " in '" + mod.dir + "'");
                });
            }
        }
        
        gulp.task(this.name, this.taskDependencies, task? task:this.task(gulp, helper, conf, project));

        this.addTaskDepend(gulp);       
        
        var taskExist = taskList.find((taskElement) => {
            return taskElement === this.name;
          });
        if(!taskExist){
            taskList.push(this.name);
            helper.getVorpal()
                .command(this.name, helper.getTaskInfo(this.name))
                .option("-d, --debug", "Mode debug")
                .option("-e, --external", "Mode auto external")
                .option("-l, --list", "Listing de toutes les tâches")
                .option("--show-webpack-files", "Log les fichiers pris en compte par webpack dans sa phase de compilation du bundle client")
                .option("--webpackVisualizer", "Visualisation de la répartition des sources projets et node modules dans un chart, /static/dev/webpack-visualizer.html")
                .option("-i, --ide", "Indique que c'est l'IDE qui compile les TS, dans ce cas la compilation TS est désactivée ainsi que les watchers associés")
                .option("-r, --registry <url>", "L'url du repository global : servant à la récupération des dépendances et à la publication")
                .option("--publish-registry <url>", "L'url du repository servant uniquement à la publication (tasks 'publish' & 'unpublish'")
                .option("-f, --force", "Forcer la mise à jour des dépendances")
                .option("--ignoreApp", "ne prend pas la version de dépendance applicative, mais la plus récente")
                .option("--skipTests", "Permet de ne pas exécuter les tests")
                .option("--stopOnError", "Permet de stopper toutes les tâches sur une erreur")    
                .option("--skipMinified", "Permet de ne pas minifier les chuncks")
                .option("--noWarn", "Permet de ne pas afficher les warnings")
                .option("-p, --debugPort <port>", "Indique le port utilisé par node pour permettre la connexion d'un debugger externe")
                .option("--lintRules <path>", "Indique un fichier de rules 'tslint.json' autre que celui utilisé par le builder")
                .option("--lintReport <format>", "Indique le format de sortie pour tslint : prose (défaut), json, verbose, full, msbuild")
                .option("-m, --module <module>", "Indique le module pour lequel on souhaite avoir une recherche de version")
                .option("--file <file>", "Indique le chemin d'un fichier")
                .option("--dev", "active le mode developpement")
                .option("--offline", "active le mode offline pour la récupération des dépendances, ex : coupure réseau. Prerequis avoir les node_modules, ajouter fetch-retries=0 dans .npmrc")
                //    .option("--release <final / snapshot>", "version ou suffixe si commence par '-' ou '.'", /^(final|snapshot)$/i)     
                .option("--versionFix <versionFix>", "version ou suffixe si commence par '-', '.' ou si null", (value) => { console.log(value); return value ? value.replace(/'/g, "") : "auto" })
                .option("--versionSearch <versionSearch>", "préfixe de la dernière version", (value) => { console.log(value); return value ? value.replace(/'/g, "") : "auto" })
                .option("--dependencyVersionFix <dependency>", "Fix une version pour une dépendance")
                .option("-q, --query <sql>", "Requête sql à executer")
                .option("--uri <chaine de connexion postgresql>", "Paramètre de chaine de connexion à l'instance postgres, ex : postgres://serveur:pwd@localhost:5432/instance-name")            
                .action((args, callback) => {
                    helper.setForce(args.options.force);
                    helper.setDebug(args.options.debug);
                    helper.setActiveExternal(args.options.external);
                    helper.setList(args.options.list);
                    helper.setRegistry(args.options.registry);
                    helper.setPublishRegistry(args.options.publishRegistry);
                    helper.setSkipTests(args.options.skipTests);
                    helper.setSkipMinified(args.options.skipMinified);
                    helper.setNoWarn(args.options.noWarn);
                    helper.setIDE(args.options.ide);
                    helper.setShowWebPackFiles(args.options.showWebpackFiles);
                    helper.setWebpackVisualizer(args.options.webpackVisualizer);
                    helper.setDebugPort(args.options.debugPort);
                    helper.setLintRules(args.options.lintRules);
                    helper.setLintReport(args.options.lintReport);
                    helper.setModule(args.options.module);
                    helper.setFile(args.options.file);
                    helper.setDevMode(args.options.dev);
                    helper.setOfflineMode(args.options.offline);
                    helper.setRelease(args.options.release);
                    helper.setVersion(args.options.versionFix);
                    helper.setVersion(args.options.versionSearch);
                    helper.setDependency(args.options.dependencyVersionFix);
                    helper.setStopOnError(args.options.stopOnError);
                    helper.setQuery(args.options.query);
                    helper.setUri(args.options.uri);
                    process.nextTick( () => {
                        require("run-sequence").apply(gulp, [name].concat(
                            function (err) {
                                if (err) {
                                    process.exit(1);
                                } else {
                                    callback();
                                }
                            }
                        ));                    
                    });
                });
            }
    }

    addTaskDepend(gulp) {
        if (this.taskDepend) {
            try {
                gulp.addTaskDependency(this.taskDepend, this.name);
            } catch(err) {
                throw new Error("Erreur lors de l'ajout des dépendances pour La tâche '" + this.name + " : " + err.message);
            }
        }
    }

    /**
     * méthode appelée à l'initialisation d'une task
     * @returns {Function} tache Gulp exécutée
     */
    task() {
        //throw new Error("La tâche '" + this.name + "' ne surcharge pas la méthode 'task'");
    }
    /**
     * méthode appelée à l'initialisation d'une task
     * @returns {Function} tache Gulp exécutée
     */
    passIfAlreadyExec(done, project) {
        if(State.taskHistory[project.name + ":" + this.name]) {
            Helper.info("Tache déjà exécutée il y a :", prettyTime(process.hrtime(State.taskHistory[project.name + ":" + this.name])));
            return true;
        }
        State.taskHistory[project.name + ":" + this.name] = process.hrtime();
        //throw new Error("La tâche '" + this.name + "' ne surcharge pas la méthode 'task'");
    }
}


module.exports = Task;
