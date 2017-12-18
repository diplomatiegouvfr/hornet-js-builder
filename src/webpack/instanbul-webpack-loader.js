//const getOptions = rerquire("loader-utils").getOptions;
var istanbul = require('istanbul');
var loaderUtils = require('loader-utils');
var assign = require('object-assign');
var convert = require('convert-source-map');

function loader(source, sourceMap) {
    // use inline source map, if any
    var inlineSourceMap = convert.fromSource(source);
    if (!sourceMap && inlineSourceMap) {
        sourceMap = inlineSourceMap.sourcemap;
    }

    var userOptions = loaderUtils.parseQuery(this.query);
    /*var instrumenter = istanbulLibInstrument.createInstrumenter(
        assign({ produceSourceMap: this.sourceMap }, userOptions)
    );*/
    var instrumenter = new istanbul.Instrumenter(assign({ produceSourceMap: this.sourceMap }, userOptions));

    if (this.cacheable) {
        this.cacheable();
    }

    var that = this;
    return instrumenter.instrument(source, this.resourcePath, function (error, source) {
        that.callback(error, source, instrumenter.lastSourceMap());
    }, sourceMap);

};

module.exports = loader;

