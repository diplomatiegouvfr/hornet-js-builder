const fs = require("fs");
const { Module } = require("module");
const path = require("path");
const Helper = require("./helpers");

let moduleDirectories = [];

if (!Module._old_nodeModulePaths) {
    Module._old_nodeModulePaths = Module._nodeModulePaths;
    Module._nodeModulePaths = function (from) {
        let paths = [];
        // ajouter au fur et à mesure suivant les besoins des taches
        moduleDirectories.forEach(function (moduleDirectory) {
            paths.push(moduleDirectory);
        });
        paths = Module._old_nodeModulePaths.call(this, from);
        paths.push(process.cwd());
        paths.push(path.join(process.cwd(), ".."));
        return paths;
    };
}

function addModuleDirectory(path2add) {
    let parent;
    path2add = path.normalize(path2add);
    const current = process.cwd();
    if (moduleDirectories.indexOf(path2add) === -1) {
        const path2addBuilder = Helper.getBuilder(path2add);
        if (fs.existsSync(path2addBuilder)) {
            const path2addBuilderJS = Helper.ReadTypeBuilderJS(path2addBuilder);
            if (
                (path2addBuilderJS !== Helper.TYPE.APPLICATION && path2addBuilderJS !== Helper.TYPE.APPLICATION_SERVER) ||
                ((path2addBuilderJS === Helper.TYPE.APPLICATION || path2addBuilderJS === Helper.TYPE.APPLICATION_SERVER) && current === path2add)
            ) {
                moduleDirectories.push(path2add);
                require.main.paths.unshift(path2add);
                parent = module.parent;
                if (parent && parent !== require.main) {
                    parent.paths.unshift(path2add);
                }
            }
        } else {
            moduleDirectories.push(path2add);
            require.main.paths.unshift(path2add);
            parent = module.parent;
            if (parent && parent !== require.main) {
                parent.paths.unshift(path2add);
            }
        }
    }
}

function removeModuleDirectory(path2remove) {
    const idx = moduleDirectories.indexOf(path2remove);
    if (idx != -1) {
        moduleDirectories.splice(idx, 1);
    }
}

function getModuleDirectories() {
    return moduleDirectories.slice(0);
}

function setModuleDirectories(paths) {
    moduleDirectories = paths.slice(0);
}

exports.addModuleDirectory = addModuleDirectory;
exports.removeModuleDirectory = removeModuleDirectory;
exports.getModuleDirectories = getModuleDirectories;
exports.setModuleDirectories = setModuleDirectories;
