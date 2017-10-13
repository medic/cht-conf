const fs = require('../lib/sync-fs');

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


module.exports = (projectDir/*, couchUrl*/) => {
  if(fs.exists(projectDir)) throw new Error(`Cannot initialise new project at ${projectDir} because directory already exists.`);

  createRecursively(projectDir, LAYOUT);
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
