module.exports = function (content) {
    this.cacheable();

    return `${content.replace(/(\.runTest\(\s*new\s+[^\(\)]+\(.*\)\s*)(\).*)$/gm, "$1, __filename$2")}`;
};
