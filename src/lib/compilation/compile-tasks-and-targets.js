const path = require('path');
const os = require('os');

const fs = require('../sync-fs');
const pack = require('./package-lib');
const nools = require('../nools-utils');
const validateDeclarativeSchema = require('./validate-declarative-schema');
const { findTasksExtensions, findTargetsExtensions } = require('../auto-include');
const { info } = require('../log');

const DECLARATIVE_NOOLS_FILES = [ 'tasks.js', 'targets.js' ];

const compileTasksAndTargets = async (projectDir, options = {}) => {
  const tryLoadLegacyRules = legacyNoolsFilePath => {
    let result;
    if (fs.exists(legacyNoolsFilePath)) {
      result = fs.read(legacyNoolsFilePath);
    }
  
    return result;
  };

  const legacyNoolsFilePath = path.join(projectDir, 'rules.nools.js');
  const legacyRules = tryLoadLegacyRules(legacyNoolsFilePath);
  
  if (legacyRules !== undefined) {
    if (findMissingDeclarativeFiles(projectDir).length !== DECLARATIVE_NOOLS_FILES.length) {
      throw new Error(
        'Both legacy and declarative files found. '
        + `You should either have rules.nools.js xor ${DECLARATIVE_NOOLS_FILES} files.`
      );
    }

    const rules = options.minifyScripts ? nools.minify(legacyRules) : legacyRules;
    return { rules };
  }

  return {
    rules: await compileDeclarativeFiles(projectDir, options),
    isDeclarative: true,
  };
};

const findMissingDeclarativeFiles = projectDir => DECLARATIVE_NOOLS_FILES.filter(filename => {
  const filePath = path.join(projectDir, filename);
  return !fs.exists(filePath);
});

const compileDeclarativeFiles = async (projectDir, options) => {
  const missingFiles = findMissingDeclarativeFiles(projectDir);
  if (missingFiles.length > 0) {
    throw new Error(`Missing required declarative configuration file(s): ${missingFiles}`);
  }

  validateDeclarativeSchema(projectDir, options.haltOnSchemaError);

  const pathToDeclarativeLib = path.join(__dirname, '../../nools/lib.js');
  const baseEslintPath = path.join(__dirname, '../../nools/.eslintrc');

  // Find auto-include files
  const tasksExtensions = findTasksExtensions(projectDir);
  const targetsExtensions = findTargetsExtensions(projectDir);

  // Build webpack aliases for extensions
  const extraAliases = {};

  tasksExtensions.forEach((filePath, index) => {
    const aliasName = `cht-tasks-extension-${index}.js`;
    extraAliases[aliasName] = filePath;
    info(`Auto-including tasks: ${path.basename(filePath)}`);
  });

  targetsExtensions.forEach((filePath, index) => {
    const aliasName = `cht-targets-extension-${index}.js`;
    extraAliases[aliasName] = filePath;
    info(`Auto-including targets: ${path.basename(filePath)}`);
  });

  // Generate shim that explicitly requires all extensions (webpack needs static requires)
  const tasksShimPath = path.join(os.tmpdir(), 'cht-tasks-extensions-shim.js');
  const tasksRequires = tasksExtensions.map((_, i) => `require('cht-tasks-extension-${i}.js')`).join(',\n  ');
  const tasksShimContent = tasksExtensions.length > 0
    ? `module.exports = [\n  ${tasksRequires}\n].flat();`
    : 'module.exports = [];';
  require('fs').writeFileSync(tasksShimPath, tasksShimContent);
  extraAliases['cht-tasks-extensions-shim.js'] = tasksShimPath;

  const targetsShimPath = path.join(os.tmpdir(), 'cht-targets-extensions-shim.js');
  const targetsRequires = targetsExtensions.map((_, i) => `require('cht-targets-extension-${i}.js')`).join(',\n  ');
  const targetsShimContent = targetsExtensions.length > 0
    ? `module.exports = [\n  ${targetsRequires}\n].flat();`
    : 'module.exports = [];';
  require('fs').writeFileSync(targetsShimPath, targetsShimContent);
  extraAliases['cht-targets-extensions-shim.js'] = targetsShimPath;

  return pack(projectDir, pathToDeclarativeLib, baseEslintPath, options, extraAliases);
};

module.exports = compileTasksAndTargets;
