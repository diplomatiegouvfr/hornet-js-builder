
var Module = require("module").Module;
var path = require("path");
var moduleDirectories = [];
var savedModuleDirectories = [];
var old_nodeModulePaths = Module._old_nodeModulePaths || Module._nodeModulePaths;

var NODE_MODULES_APP = path.join("node_modules", "app");
if (!Module._old_nodeModulePaths) {
    Module._old_nodeModulePaths = old_nodeModulePaths;
    Module._nodeModulePaths = function (from) {
        var paths = old_nodeModulePaths.call(this, from);
        paths.unshift(process.cwd());
        paths.unshift(path.join(process.cwd(), NODE_MODULES_APP));
        paths.unshift(path.join(process.cwd(), ".."));
        moduleDirectories.forEach(function (path) {
            paths.unshift(path);
        });

        return paths;
    };
}

function addModuleDirectory(path2add) {
    var parent;
    path2add = path.normalize(path2add);
    if (moduleDirectories.indexOf(path2add) === -1) {
        moduleDirectories.push(path2add);
        require.main.paths.unshift(path2add);
        parent = module.parent;
        if (parent && parent !== require.main) {
            parent.paths.unshift(path2add);
        }
    }
}

function removeModuleDirectory(path2remove) {
    var idx = moduleDirectories.indexOf(path2remove);
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