const tools = require('./webpack.tools');
const Encore = require('@symfony/webpack-encore');
const path = require('path');

tools.logTitle('Import aliases');

const paths = tools.getFrontPaths();

for (let alias in paths) {
  // Use only text keys.
  if (tools.isBundleAlias(alias)) {
    const value = path.resolve(paths[alias]);
    tools.logVar(alias, value);
    Encore.addAliases({
      [alias]: value
    });
  }
}

// All the CSS files are parsed the same way.
// Ignored CSS files are prefixed by an underscore.
tools.logTitle('CSS : all');

tools.forEachFrontPath((bundle, location) => {
  tools.addAssetsCss(
    bundle,
    location,
    '',
    'scss'
  );
});

// Take only js that is not in special folders.
tools.logTitle('JS : mains');

let allowed = ['layouts'];

tools.forEachJsExtAndLocations((srcExt, bundle, location) => {
  tools.addAssetsJs(bundle, location, '', srcExt, (srcFile) => {
    // First dir under js should be a part of allowed dirs.
    return (
      allowed.indexOf(
        srcFile.file.substring(location.length).split('/')[0]
      ) !== -1 &&
      !tools.fileIsAClass(srcFile.file) &&
      srcFile
    );
  });
});
