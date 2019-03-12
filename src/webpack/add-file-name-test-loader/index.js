const hasModule = (content) => content.indexOf('module') >= 0;
const path = require("path");
const fs = require("fs");

module.exports = function (content) {

  this.cacheable();

  return `${content.replace(/(\.runTest\(\s*new\s+[^\(\)]+\(.*\)\s*)(\).*)$/gm, "$1, __filename$2")}`;

};

