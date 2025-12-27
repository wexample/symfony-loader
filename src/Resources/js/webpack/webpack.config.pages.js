const tools = require('./webpack.tools');

tools.logTitle('JS App level pages');

tools.forEachJsExtAndLocations((srcExt, bundle, location) => {
  tools.addAssetsJsWrapped(
    bundle,
    location,
    'pages/',
    srcExt,
    'pages',
    (srcFile) => {
      // If first letter is a capital, this is an included class.
      return !tools.fileIsAClass(srcFile.file) && srcFile;
    }
  );
});
