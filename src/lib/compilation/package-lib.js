const fs = require('fs');
const os = require('os');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const webpack = require('webpack');

const fsUtils = require('../sync-fs');
const { info, warn, error } = require('../log');

module.exports = (pathToProject, entry, baseEslintPath, options = {}) => {
  const baseEslintConfig = fsUtils.readJson(baseEslintPath);

  const directoryContainingEntry = path.dirname(entry);
  const libName = path.basename(directoryContainingEntry);
  info(`Packaging ${libName}`);

  const outputDirectoryPath = os.tmpdir();
  const outputFilename = `./${libName}.js`;

  const compiler = webpack([{
    mode: 'production',
    entry,
    output: {
      path: outputDirectoryPath,
      filename: outputFilename,
      libraryTarget: options.libraryTarget ? 'umd' : undefined,
      globalObject: options.libraryTarget,
      hashFunction: 'xxhash64'
    },
    optimization: {
      minimize: !!options.minifyScripts,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            warnings: false,
            output: {
              comments: false,
              quote_style: 1,
            },
          },
        }),
      ],
    },
    resolve: {
      alias: {
        'tasks.js': path.join(pathToProject, 'tasks.js'),
        'targets.js': path.join(pathToProject, 'targets.js'),
        'contact-summary.templated.js': path.join(pathToProject, 'contact-summary.templated.js'),
      },
    },
    resolveLoader: {
      modules: [
        path.join(__dirname, '../../node_modules'),
        'node_modules',
      ],
    },
    plugins: [
      new ESLintPlugin({
        context: pathToProject,
        extensions: 'js',
        exclude: 'node_modules',
        baseConfig: baseEslintConfig,
        useEslintrc: true,
        ignore: !options.skipEslintIgnore,
        // pack the library regardless of the eslint result
        failOnError: false,
        failOnWarning: false,
      }),
      new webpack.IgnorePlugin({ resourceRegExp: /^\.\/locale$/, contextRegExp: /moment$/ }), // Ignore all optional deps of moment.js
    ]
  }]);

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        error(err.stack || err);
        if (err.details) {
          error(err.details);
        }

        return reject(err);
      }

      info(stats.toString());

      if (stats.hasErrors()) {
        return reject(Error(`Webpack errors when building ${libName}`));
      }

      if (stats.hasWarnings()) {
        const hasWarningsRelatedToLinting = stats.toJson().warnings.some(warning => warning.includes('warnings potentially fixable'));
        const shouldHalt = options.haltOnWebpackWarning ||
          options.haltOnLintMessage && hasWarningsRelatedToLinting;

        if (shouldHalt) {
          return reject(Error(`Webpack warnings when building ${libName}`));
        }

        if (hasWarningsRelatedToLinting) {
          warn('Ignoring linting errors');
        }
      }

      const outputPath = path.join(outputDirectoryPath, outputFilename);
      resolve(fs.readFileSync(outputPath).toString());
    });
  });
};
