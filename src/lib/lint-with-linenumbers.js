const { CLIEngine, Linter } = require('eslint');
const withLineNumbers = require('./with-line-numbers');

const { info, warn, error } = require('./log');

const engine = new CLIEngine();
const linter = new Linter();

module.exports = (code, lintConfigPath, options = {}) => {
  const defaultAtPath = engine.getConfigForFile(lintConfigPath);
  const eslintConfig = Object.assign(defaultAtPath, options.eslint);

  // attributes to merge instead of overwite
  ['parserOptions', 'rules', 'globals'].forEach(attr => eslintConfig[attr] = Object.assign(defaultAtPath[attr], options[attr]));

  const messages = linter.verify(code, eslintConfig);
  
  if(messages.length) {
    info(`Generated code:`);
    info(withLineNumbers(code));
    const logLevel = options.warnOnLintMessage ? warn : error;
    logLevel(messages.map(message => `ruleId: '${message.ruleId}' message: '${message.message}' line: '${message.line}' column: '${message.column}'`));

    if (!options.warnOnLintMessage) {
      throw new Error(`eslint violations found (""\\(',.,')/"")`);
    }
  }
};
