var createInnerCallback = require("enhanced-resolve/lib/createInnerCallback");
var popPathSeqment = require("enhanced-resolve/lib/popPathSeqment");
var _ = require("lodash");

function HornetModulesInDirectoriesPlugin(moduleType, directories) {
    this.moduleType = moduleType;
    this.directories = directories;
}
module.exports = HornetModulesInDirectoriesPlugin;


function filterDirectories(from, moduleDirectories) {
    var paths = [];
    var matched = matchModuleDirectory(from, moduleDirectories);

    if (matched) paths.push(matched);
    moduleDirectories.forEach((path) => { paths.push(path); });

    return paths;
}

function matchModuleDirectory(from, moduleDirectories) {
    var match = null, len = 0;
    for (var i=0;i<moduleDirectories.length;i++) {
        var mod = moduleDirectories[i];
        if (from.indexOf(mod) === 0 && mod.length > len) {
            match = mod;
            len = mod.length;
        }
    }
    return match;
}


HornetModulesInDirectoriesPlugin.prototype.apply = function(resolver) {
    var moduleType = this.moduleType;
    var directories = this.directories;
    resolver.plugin("module", function(request, callback) {
        var filteredDirectories = filterDirectories(request.path, directories);
        var fs = this.fileSystem;
        var paths = [request.path];
        var addr = [request.path];
        var pathSeqment = popPathSeqment(addr);
        var topLevelCallback = callback;
        while(pathSeqment) {
            paths.push(addr[0]);
            pathSeqment = popPathSeqment(addr);
        }
        var addrs = paths.map(function(p) {
            return filteredDirectories.map(function(d) {
                return this.join(p, d);
            }, this);
        }, this).reduce(function(array, p) {
            array.push.apply(array, p);
            return array;
        }, []);
        addrs = _.uniq(addrs);
        this.forEachBail(addrs, function(addr, callback) {
            fs.stat(addr, function(err, stat) {
                if(!err && stat && stat.isDirectory()) {
                    this.applyPluginsParallelBailResult("module-" + moduleType, {
                        path: addr,
                        request: request.request,
                        query: request.query,
                        directory: request.directory
                    }, createInnerCallback(function(err, result) {
                        if(err) return callback(err);
                        if(!result) return callback();
                        return callback(null, result);
                    }, topLevelCallback, "looking for modules in " + addr));
                    return;
                }
                return callback();
            }.bind(this));
        }.bind(this), function(err, result) {
            if(err) return callback(err);
            if(!result) return callback();
            return callback(null, result);
        });
    });
};
