const fs = require('../lib/sync-fs');
const info = require('../lib/log').info;

const LAYOUT = {
  'app_settings.json': {},
  'contact-summary.js': '',
  'resources.json': {},
  resources: {},
  'rules.nools.js': '',
  'targets.json': {},
  'tasks.json': {},
  forms: {
    app: {},
    contact: {},
  },
  translations: {},
};


module.exports = (projectDir, couchUrl, extraArgs) => {
  if(extraArgs && extraArgs.length) extraArgs.forEach(createProject);
  else createProject('.');

  function createProject(root) {
    const dir = `${projectDir}/${root}`;
    info(`Initialising project at ${dir}`);
    createRecursively(dir, LAYOUT);
  }
};

function createRecursively(dir, layout) {
  fs.mkdir(dir);

  for(const k in layout) {
    const path = `${dir}/${k}`;

    const val = layout[k];
    if(typeof val === 'object') {
      if(k.match(/.json$/)) fs.writeJson(path, val);
      else createRecursively(path, val);
    } else fs.write(path, val);
  }
}
