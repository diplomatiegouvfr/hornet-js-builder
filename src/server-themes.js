"use strict";
// Imports
// Fourni des infos sur répertoire courant sur le serveur
var path = require('path');
var serveStatic = require('serve-static');
var serveIndex = require('serve-index');

console.log("Lancement du serveur de thèmes de dev dans le dossier ", process.argv[2]);

// Serveur web
var express = require('express');

// Initialisation du serveur
var server = express();

// Permet de répondre aux requests cross site
server.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Permet de servir les fichiers statics
server.use(serveStatic(process.argv[2], {'index': false}));
// Permet d'afficher le contenu des dossiers
server.use('/', serveIndex(process.argv[2], {'icons': true}));

var port = 7777;
server.listen(port);
