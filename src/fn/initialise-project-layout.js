const path = require('path');

const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const { info } = require('../lib/log');

const LAYOUT = {
  'contact-summary.templated.js': `module.exports = {
  fields: [],
  cards: [],
  context: {}
};\n`,
  'privacy-policies.json': {},
  'privacy-policies': {},
  'resources.json': {},
  'harness.defaults.json': {},
  resources: {},
  'targets.js': 'module.exports = [];\n',
  'tasks.js': 'module.exports = [];\n',
  '.eslintrc': `{
  "env": {
    "node": true,
    "es2022": true
  },
  "parserOptions": {
    "ecmaVersion": 2022
  }
}\n`,
  forms: {
    app: {},
    collect: {},
    contact: {},
  },
  translations: {},
  app_settings: {
    'base_settings.json': {},
    'forms.json': {},
    'schedules.json': [],
  },
  test: {
    forms: {},
    'contact-summary': {},
    tasks: {},
    targets: {}
  }
};

function createRecursively(dir, layout) {
  fs.mkdir(dir);

  for (const k of Object.keys(layout)) {
    const path = `${dir}/${k}`;

    const val = layout[k];
    if (typeof val === 'object') {
      if (k.match(/.json$/)) {
        fs.writeJson(path, val);
      } else {
        createRecursively(path, val);
      }
    } else {
      fs.write(path, val);
    }
  }
}

function execute() {
  const { extraArgs } = environment;
  if (extraArgs?.length) {
    extraArgs.forEach(createProject);
  } else {
    createProject('.');
  }

  function createProject(root) {
    const dir = path.join(environment.pathToProject, root);
    info(`Initialising project at ${dir}`);
    createRecursively(dir, LAYOUT);
  }
}

module.exports = {
  requiresInstance: false,
  execute
};
