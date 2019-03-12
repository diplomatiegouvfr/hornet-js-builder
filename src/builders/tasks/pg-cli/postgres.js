"use strict";

const Task = require("./../task");
const { Client } = require("pg");


class Postgres extends Task {

    constructor(name, taskDepend, taskDependencies, gulp, helper, conf, project) {
        super(name, taskDepend, taskDependencies, gulp, helper, conf, project);
    }

    task(gulp, helper, conf, project) {
        return (done) => {

            let uri = helper.getUri();

            if(!uri){
                if(!project.configJson.database || !project.configJson.database.config || !project.configJson.database.config.uri){
                    helper.error("Chaine de connexion 'uri' non présent dans le default.json : 'database.config.uri' ou bien en paramètre --uri");
                    return done();
                } else{
                    uri = project.configJson.database.config.uri;
                }
            }

            if(!helper.getQuery()){
                helper.error("Requête SQL manquante, usage : hb pg -q '<sql>'");
                return done();
            }

            helper.debug("uri : ", uri);
            helper.debug("query : ", helper.getQuery());

            const client = new Client({
                connectionString: uri,
            });
            client.connect();
            
            client.query({text: helper.getQuery(), rowMode: "array"})
            .then((res) => {
                const reducer = (accumulator, currentValue) => "|" + currentValue;
                helper.info("\n" + res.fields.map(f => f.name).join("|") + "\n" + res.rows.map(f => f.join("|")).join("\n"));
                done(); 
            })
            .catch((e) => {
                helper.error(e.stack);
                done(); 
            });            
        }
    }
}

module.exports = Postgres;