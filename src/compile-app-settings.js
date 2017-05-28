const fs = require('./sync-fs');

module.exports = project => {
  const readProjectFile = f => fs.read(`${project}/${f}`);

  const files = {};
  [
    'app_settings.json',
    'contact-summary.js',
    'nools.js',
    'schedules.json',
    'targets.json',
  ].forEach(f => files[simple(f)] = readProjectFile(f));

  console.log('app_settings: ', files);

  const app_settings = JSON.parse(files.app_settings);

  app_settings.contact_summary = cleanJs(files.contact_summary);

  app_settings.tasks = {
    rules: cleanJs(files.nools),
    schedules: JSON.parse(files.schedules),
    targets: JSON.parse(files.targets),
  };

  fs.writeJson(`${project}/app_settings.json`, app_settings);
};

const simple = s => s.replace(/\..*/, '').replace('-', '_');
const cleanJs = js => js.split('\n').map(s => s.trim().replace(/\s*\/\/.*/, '')).join('');
