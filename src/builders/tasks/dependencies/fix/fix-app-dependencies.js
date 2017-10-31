"use strict";
const path = require("path");
const npm = require("npm");

const Task = require("../../task");
const State = require("../../../state");
const Utils = require("../../utils");

class FixAppDependencies extends Task {

    task(gulp, helper, conf, project) {
        return (done) => {
            if (!State.appDependenciesChanged) { return done(); }

            let root = project.packageJson;
            let rootStr = root.name + "@" + root.version;


            let rootReport = State.report[root.name][root.version];
            let mergedDeps = helper.mergeReportDependencies(root, State.report);

            // on extrait les nouvelles versions à fixer
            let newFixed = {};
            helper.forEach3Depth(mergedDeps, (name, version, issuer) => {
                if (version != mergedDeps[name][version][issuer] || (rootReport.deps[name] && project.type === helper.TYPE.MODULE)) {
                    newFixed[name] = {};
                    newFixed[name][version] = {};
                    newFixed[name][version][rootStr] = 1;
                }
            });

            if (!(helper.HB_JSON_KEY in root)) root[helper.HB_JSON_KEY] = {
                current: "",
                history: {}
            };

            // on vérifie si on doit sauvegarder le package.json
            let saveJson = false;
            let depsHash = helper.getDependenciesHash(root);
            if (Object.keys(newFixed).length > 0 || !root[helper.HB_JSON_KEY].history[depsHash]) {
                saveJson = true;
                root[helper.HB_JSON_KEY].current = depsHash;

                let allFixed = {};
                helper.forEach1Depth(rootReport.fixed, (name, version) => {
                    allFixed[name] = version;
                });
                helper.forEach2Depth(newFixed, (name, version) => {
                    allFixed[name] = version;
                });
                allFixed = helper.sortObj(allFixed);
                root[helper.HB_JSON_KEY].history[depsHash] = {
                    version: root.version,
                    date: new Date(),
                    deps: allFixed
                };

            } else if (root[helper.HB_JSON_KEY]) {
                // cas d'un hash déjà présent > on actualise la date de l'historique
                if (root[helper.HB_JSON_KEY].current && depsHash != root[helper.HB_JSON_KEY].current) {
                    root[helper.HB_JSON_KEY].current = depsHash;
                    root[helper.HB_JSON_KEY].history[depsHash].date = new Date();
                    saveJson = true;
                }
            }

            // On sauvegarde le package.json si nécessaire
            if (saveJson) {
                // on trie l'historique afin que le courant soit le dernier
                root[helper.HB_JSON_KEY].history = helper.sortObj(root[helper.HB_JSON_KEY].history, (h1, h2) => {
                    let d1 = new Date(h1.value.date);
                    let d2 = new Date(h2.value.date);
                    return d1 < d2 ? -1 : d1 > d2 ? 1 : 0;
                });
                helper.stream(
                    done,
                    gulp.src(["package.json"])
                        .pipe(Utils.packageJsonFormatter(helper, project))
                        .pipe(gulp.dest("."))
                );
            } else {
                return done();
            }
        }
    }
}

module.exports = FixAppDependencies;