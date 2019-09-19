const path = require('path');

const fs = require('../lib/sync-fs');
const { info } = require('../lib/log');

const LAYOUT = {
  'app_settings.json': {},
  'contact-summary.js': '',
  'resources.json': {},
  resources: {},
  'targets.js': 'module.exports = [];',
  'tasks.js': 'module.exports = [];',
  'task-schedules.json': {},
  '.eslintrc': `{
  "env": {
    "node": true,
    "es6": true
  },
  "parserOptions": {
    "ecmaVersion": 6
  }
}`,
  forms: {
    app: {},
    collect: {},
    contact: {},
  },
  translations: {},
};


module.exports = (projectDir, apiUrl, extraArgs) => {
  if(extraArgs && extraArgs.length) extraArgs.forEach(createProject);
  else createProject('.');

  function createProject(root) {
    const dir = path.join(projectDir, root);
    info(`Initialising project at ${dir}`);
    createRecursively(dir, LAYOUT);
  }
};

function createRecursively(dir, layout) {
  fs.mkdir(dir);

  for (const k in layout) {
    const path = `${dir}/${k}`;

    const val = layout[k];
    if (typeof val === 'object') {
      if (k.match(/.json$/)) {
        fs.writeJson(path, val);
      } else {
        createRecursively(path, val);
      }
    } else fs.write(path, val);
  }
}
