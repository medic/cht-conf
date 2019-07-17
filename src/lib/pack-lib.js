const fs = require('fs');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

const { info, warn, error } = require('./log');

module.exports = (pathToProject, pathToLib, options = {}) => {
  const entry = path.join(pathToLib, 'lib.js');
  const baseEslintPath = path.join(pathToLib, '.eslintrc');
  const outputDirectoryPath = path.join(path.dirname(require.main.filename), '../../build');

  const libName = path.basename(pathToLib);

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
            failOnError: !options.haltOnLintMessage,
            failOnWarning: !options.haltOnLintMessage,
            baseConfig: baseEslintPath,
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

      const statsInfo = stats.toJson();
      if (stats.hasErrors()) {
        error('ERRORS');
        error(JSON.stringify(statsInfo.errors, null, 2));
        reject(statsInfo.errors);
      }

      if (stats.hasWarnings()) {
        const logLevel = options.haltOnWebpackWarning ? error : warn;
        logLevel('WARNING');
        logLevel(JSON.stringify(statsInfo.warnings, null, 2));

        if (options.haltOnWebpackWarning) {
          reject(statsInfo.warnings);
        }
      }

      info(stats.toString());

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
