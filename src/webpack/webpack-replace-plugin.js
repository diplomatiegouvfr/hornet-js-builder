const isRegex = any => any instanceof RegExp;
const isBool = any => typeof any === 'boolean';
const isString = any => typeof any === 'string';
const isFunction = any => typeof any === 'function';

const toArray = any => Array.isArray(any) ? any : (any == null ? [] : [any]);

function toFunction(val) {
	if (isBool(val)) return _ => val;
	if (isRegex(val)) return str => val.test(str);
	if (isString(val)) return str => str.includes(val);
	if (isFunction(val)) return str => val(str);
}

function evalArr(funcs, str) {
	let i=0, len=funcs.length;
	for (; i < len; i++) {
		if (funcs[i](str) === true) {
			return true; // match ANY cond
		}
	}
	return false;
}

const NullFactory = require("webpack/lib/NullFactory");
const NullDependency = require("webpack/lib/dependencies/NullDependency");

class ConstDependency extends NullDependency {
	constructor(expression, range) {
		super();
		this.expression = expression;
		this.range = range;
	}

	updateHash(hash) {
		hash.update(this.range + "");
		hash.update(this.expression + "");
	}
}

ConstDependency.Template = class ConstDependencyTemplate {
	apply(dep, source) {
		if(typeof dep.range === "number") {
			source.insert(dep.range, dep.expression);
			return;
		}

		source.replace(dep.range[0], dep.range[1] - 1, dep.expression);
	}
};


class ReplacePlugin {
	
	constructor(opts) {
		opts = Object.assign({ include:true, exclude:false, replacements: []}, opts);

		const includes = toArray(opts.include).map(toFunction);
		const excludes = toArray(opts.exclude).map(toFunction);

		this.isMatch = str => (str !== void 0) && evalArr(includes, str) && !evalArr(excludes, str);
		this.replacements = opts.replacements;
	}

	apply(compiler) {

		const isMatch = this.isMatch;

		if (this.replacements && Array.isArray(this.replacements) && this.replacements.length > 0) {
			compiler.plugin("compilation", (compilation, params) => {
				compilation.dependencyFactories.set(ConstDependency, new NullFactory());
				compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());
				params.normalModuleFactory.plugin("parser", (parser) => {
					this.replacements.forEach(function (replacement) {
						const replaceBy = replacement.by;
						if(replacement.key) {
							parser.plugin("expression " + replacement.key, function(expr) {
								if (isMatch(this.state.module.resource)) {
									var dep = new ConstDependency(replaceBy, expr.range);
									dep.loc = expr.loc;
									this.state.current.addDependency(dep);
								}
								return true;
							});
						}
					});
				});
			});
		}
	}
}


module.exports = ReplacePlugin;
