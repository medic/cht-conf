const fs = require('../lib/sync-fs');

const FILES = {
  app_settings: 'json',
  'contact-summary': 'js',
  nools: 'js',
  tasks: 'json',
  targets: 'json',
};

module.exports = (project /*, couchUrl */) => {
  return Promise.resolve()
    .then(() => {
      const files = filesFor(project);

      const app_settings = files.app_settings;

      app_settings.contact_summary = files.contact_summary;

      app_settings.tasks = {
        rules: files.nools,
        schedules: files.tasks,
        targets: files.targets,
      };

      fs.writeJson(`${project}/app_settings.json`, app_settings);
    });
};

const filesFor = project => {
  const files = {};
  for(const name in FILES) {
    const type = FILES[name];
    const path = `${project}/${name}.${type}`;

    files[simple(name)] = readerFor[type](path);
  }
  return files;
};

const readerFor = {
  js: path => cleanJs(fs.read(path)),
  json: fs.readJson,
};

const simple = s => s.replace(/\..*/, '').replace('-', '_');
const cleanJs = js =>
  js.split('\n')
    .map(s =>
      s.trim()
        .replace(/\s*\/\/.*/, '') // single-line comments (like this one)
    ).join('')
        .replace(/\s*\/\*(?:(?!\*\/).)*\*\/\s*/g, ''); /* this kind of comment */
