const validateOptions = require("schema-utils");
const helper = require("../../helpers");

const schema = {
    type: "object",
    required: ["notUseModules"],
    properties: {
        notUseModules: {
            type: "array",
            items: {
                type: "string",
            },
        },
    },
    additionalProperties: false,
};

class DependenciesAnalyzerPlugin {
    constructor(options) {
        validateOptions(schema, options, "Verify Module Path Loader");
        this.opts = { ...options };
    }

    apply(compiler) {
        this.compiler = compiler;

        const done = (stats, callback) => {
            callback = callback || (() => {});
            stats = stats.toJson(this.opts.statsOptions);
            if (stats.modules && Array.isArray(stats.modules)) {
                stats.modules.forEach((mod) => {
                    !mod.name.includes("hornet-js-builder") &&
                    this.opts.notUseModules &&
                        this.opts.notUseModules.forEach((notUseModule) => {
                            if (mod.built && new RegExp(notUseModule).test(mod.name)) {
                                let reason = "";
                                if (mod.reasons && Array.isArray(mod.reasons)) {
                                    mod.reasons.forEach((modReason) => {
                                        reason = `${reason} > ${modReason.module}\n`;
                                    });
                                }
                                helper.warn(`DependenciesAnalyzerPlugin ==> ${mod.name} \n${reason}`);
                            }
                        });
                });
            }
            callback();
        };

        if (compiler.hooks) {
            compiler.hooks.done.tapAsync("webpack-bundle-analyzer", done);
        } else {
            compiler.plugin("done", done);
        }
    }
}

module.exports = DependenciesAnalyzerPlugin;
