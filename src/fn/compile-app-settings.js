const fs = require('../lib/sync-fs');

module.exports = (project /*, couchUrl */) => {
  const fromProject = relativePath => `${project}/${relativePath}`;

  return Promise.resolve()
    .then(() => {
      const files = {
        app_settings: fs.readJson(fromProject('app_settings.json')),
        contact_summary: readJs(fromProject('contact-summary.js')),
        nools: readJs(fromProject('tasks/rules.nools.js')),
        targets: fs.readJson(fromProject('targets.json')),
        tasks_schedules: fs.readJson(fromProject('tasks/schedules.json')),
      };

      const app_settings = files.app_settings;

      app_settings.contact_summary = files.contact_summary;

      app_settings.tasks = {
        rules: files.nools,
        schedules: files.tasks_schedules,
        targets: files.targets,
      };

      fs.writeJson(`${project}/app_settings.json`, app_settings);
    });
};

const readJs = path => cleanJs(fs.read(path));
const cleanJs = js =>
  js.split('\n')
    .map(s =>
      s.trim()
        .replace(/\s*\/\/.*/, '') // single-line comments (like this one)
    ).join('')
        .replace(/\s*\/\*(?:(?!\*\/).)*\*\/\s*/g, ''); /* this kind of comment */
