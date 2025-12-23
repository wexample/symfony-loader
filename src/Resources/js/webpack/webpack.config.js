const {execSync} = require('child_process');
const Encore = require('@symfony/webpack-encore');
const {
  configureEncoreBase,
  applyManifestEntries,
} = require('./encore.manifest');

// Ensure routing dump and manifest are up to date before configuring Encore.
execSync('bin/console fos:js-routing:dump', {stdio: 'inherit'});
execSync('bin/console loader:generate-encore-manifest', {stdio: 'inherit'});

configureEncoreBase();
applyManifestEntries();

module.exports = Encore;
