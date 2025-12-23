const Encore = require('@symfony/webpack-encore');
const glob = require('glob');
const fs = require('fs');
const execSync = require('child_process').execSync;
const path = require('path');
const {toClass} = require("../../../../assets/js/helpers/StringHelper");

let entries = {};

module.exports = {
  jsFilesExtensions: ['js', 'ts'],
  tempPath: './var/tmp/build/',
  frontCachePathsFile: path.join(process.cwd(), 'assets', 'front.json'),
  wrapperTemplatePath: __dirname + '/../build/wrapper.js.tpl',
  extToTypesMap: {
    css: 'css',
    js: 'js',
    scss: 'css',
    ts: 'js',
    vue: 'js',
  },

  getFrontPaths() {
    execSync('php bin/console design-system:get-fronts', {encoding: 'utf-8'});

    if (!fs.existsSync(this.frontCachePathsFile)) {
      throw new Error('Missing file ' + this.frontCachePathsFile);
    }

    return JSON.parse(fs.readFileSync(this.frontCachePathsFile, 'utf-8'));
  },

  forEachFrontPath(callback) {
    Object.entries(this.getFrontPaths()).forEach((entry) => {
      let bundle = entry[0]

      if (this.isBundleAlias(bundle)) {
        bundle = '@' + toClass(
            bundle
              .replaceAll('/', '-')
              .substring(1))
          + 'Bundle';
      }

      callback(this.isBundleAlias(bundle) ? bundle : '@front', entry[1])
    });
  },

  getFileName(path) {
    return path.substring(path.lastIndexOf('/') + 1);
  },

  isBundleAlias(alias) {
    return isNaN(parseInt(alias));
  },

  fileIsAClass(filePath) {
    let fileName = this.getFileName(filePath);
    // If first letter is a capital, this is a included class.
    return fileName[0].toUpperCase() === fileName[0];
  },

  forEachJsExtAndLocations(callback) {
    this.jsFilesExtensions.forEach((srcExt) => {
      this.forEachFrontPath((bundle, location) => {
        callback(srcExt, bundle, location);
      });
    });
  },

  logTitle(string, color = 'cyan') {
    console.log('');
    console.log(module.exports.textLogColor('# ' + string.toUpperCase(), color));
  },

  /**
   * @from: https://gist.github.com/youssman/745578062609e8acac9f
   * @param myStr
   * @returns {*}
   */
  camelCaseToDash: myStr => {
    return myStr.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  },

  removeFileExtension: fileName => {
    return fileName
      .split('.')
      .slice(0, -1)
      .join('.');
  },

  /**
   * Map ./assets/(js|css)/* to ./public/build/(js|css)/*
   */
  addAssetsSyncEntries: (
    bundle,
    srcAssetsDir,
    srcSubDir,
    srcExt,
    command,
    callback
  ) => {
    let files = glob.sync(path.join(srcAssetsDir, srcSubDir, '**/*.' + srcExt));
    bundle = module.exports.isBundleAlias(bundle) ? bundle : '@front';

    for (let file of files) {
      let srcFile = {
        dir: srcAssetsDir,
        file: `./${file}`,
      };
      // Allow callback to filter files to pack.
      srcFile = callback ? callback(srcFile) : srcFile;

      if (srcFile) {
        let basename = path.basename(srcFile.file);

        // Exclude underscores.
        if (basename[0] !== '_') {
          let finalExt = module.exports.extToTypesMap[srcExt];
          let fileDest = bundle
            + '/' + finalExt
            + '/' + srcFile.file
              .substr(srcFile.dir.length)
              .split('.')
              .slice(0, -1)
              .join('.');

          // Ignore duplicates, it allows local script to override core script.
          if (!entries[fileDest]) {
            const pathDestRel =
              srcFile.file.substr(srcFile.dir.length);

            console.log('    From', file);
            module.exports.logVarPath('      > bundle : ', bundle);
            module.exports.logVarPath('      > watching : ', srcFile.dir, pathDestRel);
            module.exports.logVarPath('      > to       : ', './public/build/', fileDest);
            console.log('');

            entries[fileDest] = srcFile.file;
            Encore[command](fileDest, srcFile.file);
          } else {
            console.log('    Ignoring : ' + file);
            module.exports.logVarPath('        > Item already registered : ', fileDest);
            console.log('');
          }
        }
      }
    }
  },

  logVar(name, value = '', color, colorLabel = 'grayMedium') {
    console.log(
      module.exports.textLogColor(name, colorLabel)
      + module.exports.textLogColor(value, color)
    );
  },

  logVarPath() {
    let args = [...arguments];

    module.exports.logVar(
      args.shift(),
      module.exports.textLogPath.apply(this, args)
    );
  },

  textLogPath(one, two, three) {
    let output = '';

    output += module
      .exports
      .textLogColor(one, two || three ? 'cyanDark' : 'yellowDark');

    if (two) {
      output += module
        .exports
        .textLogColor(two, (three ? 'cyan' : 'yellowDark'));
    }

    if (three) {
      output += module
        .exports
        .textLogColor(three, 'yellowDark');
    }

    return output;
  },

  textLogColor(text, color = 'default', style = 'regular') {
    style = {
      bold: 1,
      regular: 0,
      underline: 4,
    }[style];

    if (typeof color === 'string') {
      color = {
        blue: '012',
        blueDark: '004',
        cyan: '014',
        cyanDark: '006',
        default: '250',
        grayLight: '248',
        grayMedium: '243',
        grayDark: '240',
        yellow: '011',
        yellowDark: '003'
      }[color];
    }

    return "\033[" + `${style};38;5;${color}m${text}\x1b[0m`;
  },

  addAssetsCss: (bundle, srcAssetsDir, srcSubDir, srcExt, callback) => {
    return module.exports.addAssetsSyncEntries(
      bundle,
      srcAssetsDir,
      srcSubDir,
      srcExt,
      'addStyleEntry',
      callback
    );
  },

  addAssetsJs: (bundle, srcAssetsDir, srcSubDir, srcExt, callback) => {
    return module.exports.addAssetsSyncEntries(
      bundle,
      srcAssetsDir,
      srcSubDir,
      srcExt,
      'addEntry',
      callback
    );
  },

  getPathFromTemp() {
    return '../'.repeat(module.exports.tempPath.split('/').length - 1);
  },

  getRootPathFrom(path) {
    return (
      module.exports.getPathFromTemp() +
      '../'.repeat(path.split('/').length - 1)
    );
  },

  addAssetsJsWrapped: (bundle, srcAssetsDir, srcSubDir, srcExt, type, callback) => {
    let templateContentBase = fs.readFileSync(
      module.exports.wrapperTemplatePath,
      'utf8'
    );

    module.exports.addAssetsJs(bundle, srcAssetsDir, srcSubDir, srcExt, (srcFile) => {
      // Allow callback to filter files to pack.
      srcFile = callback ? callback(srcFile) : srcFile;

      if (srcFile) {
        let pathWithoutExt = module.exports.removeFileExtension(
          srcFile.file.slice(srcAssetsDir.length)
        );
        let exp = pathWithoutExt.split('/');
        let fileNameWithoutExt = exp.pop();
        let rootPathFromAsset = module.exports.getRootPathFrom(exp.join('/'));
        let assetPathRelative = exp.join('/') + '/';
        let assetPathTemp = module.exports.tempPath + assetPathRelative;
        let templateContent = templateContentBase;
        const className = bundle + '/' + pathWithoutExt;

        fs.mkdirSync(assetPathTemp, {recursive: true});

        let placeHolders = {
          type: type,
          className: className,
          classPath: rootPathFromAsset + srcFile.file,
        };

        Object.entries(placeHolders).forEach((data) => {
          let placeHolder = data[0];
          let value = data[1];

          templateContent = templateContent.replace(
            new RegExp('{' + placeHolder + '}', 'g'),
            value
          );
        });

        let wrapperPath =
          assetPathTemp +
          module.exports.camelCaseToDash(fileNameWithoutExt) +
          '.js';
        fs.writeFileSync(wrapperPath, templateContent);

        return {
          dir: module.exports.tempPath,
          file: wrapperPath,
        };
      }
    });
  },
};
