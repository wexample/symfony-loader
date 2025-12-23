const tools = require('./webpack.tools');

tools.logTitle('Vues app level');

tools.forEachFrontPath((bundle, location) => {
  tools.addAssetsJsWrapped(
    bundle,
    location,
    '',
    'vue',
    'vue'
  );
});
