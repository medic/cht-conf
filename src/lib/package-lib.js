const fs = require('fs');
const fsUtils = require('../lib/sync-fs');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

const { info, warn, error } = require('./log');

module.exports = (pathToProject, pathToLib, options = {}) => {
  const entry = path.join(pathToLib, 'lib.js');
  const baseEslintPath = path.join(pathToLib, '.eslintrc');
  const baseEslintConfig = fsUtils.readJson(baseEslintPath);
  const outputDirectoryPath = path.join(__dirname, '../../build');

  const libName = path.basename(pathToLib);
  info(`Packaging ${libName}`);

  const temporaryOutputFilename = `./${libName}.js`;
  createDirectoryIfNecessary(outputDirectoryPath);

  const compiler = webpack([{
    mode: 'production',
    entry,
    output: {
      pathinfo: false,
      filename: temporaryOutputFilename,
      path: outputDirectoryPath,
    },
    optimization: {
      minimize: !!options.minifyScripts,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            warnings: true,
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
    module: {
      rules: [
        {
          enforce: 'pre',
          test: /\.js$/,
          loader: 'eslint-loader',
          exclude: /node_modules/,
          options: {
            baseConfig: baseEslintConfig,
            useEslintrc: true,

            // pack the library regardless of the eslint result
            failOnError: false,
            failOnWarning: false,
          },
        },
      ],
    }
  }]);

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        error(err.stack || err);
        if (err.details) {
          error(err.details);
        }
        
        reject(err);
      }

      info(stats.toString());
      
      if (stats.hasErrors()) {
        const shouldHalt = () => {
          if (options.haltOnLintMessage) {
            return true;
          }

          const { errors } = stats.toJson();
          return errors.some(err => !err.includes('(from ./node_modules/eslint-loader/index.js)'));
        };

        if (shouldHalt()) {
          return reject(Error(`Webpack errors when building ${libName}`));
        } else {
          warn('Ignoring linting errors');
        }
      }

      if (stats.hasWarnings()) {
        if (options.haltOnWebpackWarning) {
          return reject(Error(`Webpack warnings when building ${libName}`));
        }
      }

      const outputPath = path.join(outputDirectoryPath, temporaryOutputFilename);
      resolve(fs.readFileSync(outputPath));
    });
  });
};

const createDirectoryIfNecessary = directoryPath => {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath);
  }
};
