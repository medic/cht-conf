const fs = require('../lib/sync-fs');

const LAYOUT = {
  'app_settings.json': {},
  'contact-summary.js': '',
  'resources.json': {},
  resources: {},
  'targets.json': {},
  tasks: {
    'rules.nools.js': '',
    'schedules.json': {},
  },
  forms: {
    app: {},
    contact: {},
  },
  translations: {},
};


module.exports = (project/*, couchUrl*/) => {
  if(fs.exists(project)) throw new Error(`Cannot initialise new project at ${project} because directory already exists.`);

  createRecursively(project, LAYOUT);
};

function createRecursively(dir, layout) {
  let k, path;

  fs.mkdir(dir);

  for(k in layout) {
    path = `${dir}/${k}`;

    const val = layout[k];
    if(typeof val === 'object') {
      if(k.match(/.json$/)) fs.writeJson(path, val);
      else createRecursively(path, val);
    } else fs.write(path, val);
  }
}
