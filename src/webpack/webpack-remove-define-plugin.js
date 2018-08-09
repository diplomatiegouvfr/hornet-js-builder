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

class RemoveDefinePlugin {
	
	constructor(opts) {
		opts = Object.assign({ include:true, exclude:false}, opts);

		const includes = toArray(opts.include).map(toFunction);
		const excludes = toArray(opts.exclude).map(toFunction);

		this.isMatch = str => (str !== void 0) && evalArr(includes, str) && !evalArr(excludes, str);
	}

	apply(compiler) {

		const isMatch = this.isMatch;

		compiler.plugin("compilation", (compilation, params) => {
			params.normalModuleFactory.plugin("parser", (parser) => {
				parser.plugin("expression process.env.NODE_ENV", function() {
					if (isMatch(this.state.module.resource)) return true;
				});
			});
		});
	}
}

module.exports = RemoveDefinePlugin;
