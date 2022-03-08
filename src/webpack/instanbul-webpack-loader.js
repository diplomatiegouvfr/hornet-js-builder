const convert = require("convert-source-map");
const { createInstrumenter } = require("istanbul-lib-instrument");
const loaderUtils = require("loader-utils");

const instrumenter = createInstrumenter({
    preserveComments: false,
    includeUntested: true,
    noCompact: true,
});

function loader(source, sourceMap) {
    // use inline source map, if any
    const inlineSourceMap = convert.fromSource(source);
    if (!sourceMap && inlineSourceMap) {
        sourceMap = inlineSourceMap.sourcemap;
    }

    const userOptions = loaderUtils.parseQuery(this.query || "?");

    if (this.cacheable) {
        this.cacheable();
    }

    const that = this;

    return instrumenter.instrument(
        source,
        this.resourcePath,
        function (error, currentSource) {
            that.callback(error, currentSource, instrumenter.lastSourceMap());
        },
        sourceMap,
    );
}

module.exports = loader;
