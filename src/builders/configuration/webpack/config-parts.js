"use strict";

let exp = {};

// Bundle splitting :
//    - création d'un nouveau bundle ('entry chunk')
exp.extractBundle = function (webpack, bundles, options) {
  const entry = {};
  const bundlesNname = [];

  for(let i=0; i < bundles.length; i++) {
    let bundle = bundles[i]
    if (bundle && bundle.name) {
      entry[bundle.name] = bundle.entries;
    }
    bundlesNname.push(bundle.name);
  }

  return {
      entry,
      plugins: [
        new webpack.optimize.CommonsChunkPlugin(
          Object.assign({names: bundlesNname}, options)
        )
      ]
    };
};

module.exports = exp;