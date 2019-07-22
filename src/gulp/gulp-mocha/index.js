"use strict";
var domain = require("domain"); // eslint-disable-line no-restricted-modules
const PluginError = require("plugin-error");
var through2 = require("through2");
var Mocha = require("mocha");
var reqCwd = require("import-cwd");

const noop = () => {};

module.exports = function (opts = {}, done = noop) {
	if (typeof opts === 'function') {
		done = opts;
		opts = {};
	  }

	var mocha = new Mocha(opts);
	var cache = {};

	for (var key in require.cache) { // eslint-disable-line guard-for-in
		cache[key] = true;
	}

	function clearCache() {
		for (var key in require.cache) {
			if (!cache[key] && !/\.node$/.test(key)) {
				delete require.cache[key];
			}
		}
	}

	if (Array.isArray(opts.require) && opts.require.length) {
		opts.require.forEach(function (x) {
			reqCwd(x);
		});
	}

	return through2({objectMode: true}, function (file, enc, cb) {
		if (!file.path) {
			return cb();
		}
		mocha.addFile(file.path);
		this.push(file);
		cb();
	}, function () {
		var self = this;
		var d = domain.create();
		var runner;

		function handleException(err) {
			if (runner) {
				runner.uncaught(err);
			} else {
				clearCache();
				self.emit('error', new PluginError('gulp-mocha', err, {
					stack: err.stack,
					showStack: true
				}));
			}
		}

		d.on('error', handleException);
		d.run(function () {
			try {
				runner = mocha.run(function (errCount) {
					clearCache();

					if (errCount > 0) {
						self.emit('error', new PluginError('gulp-mocha', errCount + ' ' + 'test(s) failed.', {
							showStack: false
						}));
					}

					self.emit('end');
					done();
				});
			} catch (err) {
				handleException(err);
			}
		});
	});
};

