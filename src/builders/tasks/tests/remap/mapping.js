const { SourceMapConsumer } = require("source-map");

/**
 * A function that determines the original position for a given location
 * @param  {SourceMapConsumer} sourceMap        The source map
 * @param  {Object}            location         The original location Object
 * @return {Object}                             The remapped location Object
 */
function getMapping(sourceMap, location) {
    /* istanbul ignore if: edge case too hard to test for with babel malformation */
    if (location.start.line < 1 || location.start.column < 0) {
        return null;
    }
    /* istanbul ignore if: edge case too hard to test for with babel malformation */
    if (location.end.line < 1 || location.end.column < 0) {
        return null;
    }

    const start = sourceMap.originalPositionFor(location.start);
    let end = sourceMap.originalPositionFor(location.end);

    /* istanbul ignore if: edge case too hard to test for */
    if (!start || !end) {
        return null;
    }
    if (!start.source || !end.source || start.source !== end.source) {
        return null;
    }
    /* istanbul ignore if: edge case too hard to test for */
    if (start.line === null || start.column === null) {
        return null;
    }
    /* istanbul ignore if: edge case too hard to test for */
    if (end.line === null || end.column === null) {
        return null;
    }

    if (start.line === end.line && start.column === end.column) {
        end = sourceMap.originalPositionFor({
            line: location.end.line,
            column: location.end.column,
            bias: SourceMapConsumer.LEAST_UPPER_BOUND,
        });
        end.column -= 1;
    }

    return {
        source: start.source,
        loc: {
            start: {
                line: start.line,
                column: start.column,
            },
            end: {
                line: end.line,
                column: end.column,
            },
            skip: location.skip,
        },
    };
}

function remapBranch(genItem, getMapping) {
    const locations = [];
    let source;

    for (let i = 0; i < genItem.locations.length; i += 1) {
        const mapping = getMapping(genItem.locations[i]);
        if (!mapping) {
            return null;
        }
        /* istanbul ignore else: edge case too hard to test for */
        if (!source) {
            source = mapping.source;
        } else if (source !== mapping.source) {
            return null;
        }
        locations.push(mapping.loc);
    }

    const locMapping = genItem.loc && getMapping(genItem.loc);

    const srcItem = {
        line: locations[0].start.line,
        type: genItem.type,
        locations,
        loc: locMapping ? locMapping.loc : undefined,
    };

    return { source, srcItem };
}

function remapFunction(genItem, getMapping) {
    const mapping = getMapping(genItem.loc);

    if (!mapping) {
        return null;
    }

    const declMapping = genItem.decl && getMapping(genItem.decl);

    const srcItem = {
        name: genItem.name,
        line: mapping.loc.start.line,
        loc: mapping.loc,
        decl: declMapping ? declMapping.loc : undefined,
    };

    if (genItem.skip) {
        srcItem.skip = genItem.skip;
    }

    return { srcItem, source: mapping.source };
}

module.exports = { getMapping, remapBranch, remapFunction };
