const fs = require('../lib/sync-fs');

module.exports = (projectDir /*, couchUrl */) => {

  return Promise.resolve()
    .then(() => {

      let app_settings;

      const inheritedPath = `${projectDir}/settings.inherit.json`;
      if(fs.exists(inheritedPath)) {
        const inherited = fs.readJson(inheritedPath);
        app_settings = compileAppSettings(`${projectDir}/${inherited.parent}`);
        for(let key of Object.keys(inherited.app_settings)) {
          app_settings[key] = inherited.app_settings[key];
        }
      } else {
        app_settings = compileAppSettings(projectDir);
      }

      fs.writeJson(`${projectDir}/app_settings.json`, app_settings);

    });

  function compileAppSettings(projectDir) {
    const files = {
      app_settings: fs.readJson(`${projectDir}/app_settings.json`),
      contact_summary: readJs(`${projectDir}/contact-summary.js`),
      nools: readJs(`${projectDir}/rules.nools.js`),
      targets: fs.readJson(`${projectDir}/targets.json`),
      tasks_schedules: fs.readJson(`${projectDir}/tasks.json`),
    };

    const app_settings = files.app_settings;

    app_settings.contact_summary = files.contact_summary;

    app_settings.tasks = {
      rules: files.nools,
      schedules: files.tasks_schedules,
      targets: files.targets,
    };

    return app_settings;
  }

};

const readJs = path => cleanJs(fs.read(path));
const cleanJs = js =>
  js.split('\n')
    .map(s =>
      s.trim()
        .replace(/\s*\/\/.*/, '') // single-line comments (like this one)
    ).join('')
        .replace(/\s*\/\*(?:(?!\*\/).)*\*\/\s*/g, ''); /* this kind of comment */
