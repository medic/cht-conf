const fs = require('../lib/sync-fs');

module.exports = (projectDir /*, couchUrl */) => {

  return Promise.resolve()
    .then(() => {

      let app_settings;

      const inheritedPath = `${projectDir}/settings.inherit.json`;
      if(fs.exists(inheritedPath)) {

        const inherited = fs.readJson(inheritedPath);
        app_settings = compileAppSettings(`${projectDir}/${inherited.inherit}`);

        applyTransforms(app_settings, inherited);

      } else {
        app_settings = compileAppSettings(projectDir);
      }

      fs.writeJson(`${projectDir}/app_settings.json`, app_settings);

    });

  function compileAppSettings(projectDir) {
    const files = {
      app_settings: fs.readJson(`${projectDir}/app_settings.json`),
      contact_summary: readJs(`${projectDir}/contact-summary.js`),
      nools: loadNools(projectDir),
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

function applyTransforms(app_settings, inherited) {
  doDelete(app_settings, inherited.delete);
  doReplace(app_settings, inherited.replace);
  doMerge(app_settings, inherited.merge);
  doFilter(app_settings, inherited.filter);
}

function doDelete(target, rules) {
  if(!Array.isArray(rules)) throw new Error(".delete should be an array");

  rules.forEach(k => {
    const parts = k.split('.');
    let t = target;
    while(parts.length > 1) {
      t = t[parts[0]];
      parts.shift();
    }
    delete t[parts[0]];
  });
}

function doReplace(target, rules) {
  if(typeof rules !== 'object') throw new Error(".replace should be an object");

  Object.keys(rules)
    .forEach(k => {
      const parts = k.split('.');
      let t = target;
      while(parts.length > 1) {
        t = t[parts[0]];
        parts.shift();
      }
      t[parts[0]] = rules[k];
    });
}

function doMerge(target, source) {
  Object.keys(target)
    .forEach(k => {
      if(Array.isArray(source[k])) target[k] = target[k].concat(source[k]);
      else if(typeof source[k] === 'object') doMerge(target[k], source[k]);
      else source[k] = target[k];
    });
}

function doFilter(target, rules) {
  if(typeof rules !== 'object') throw new Error(".filter should be an object");

  Object.keys(rules)
    .forEach(k => {
      const parts = k.split('.');
      let t = target;
      while(parts.length > 1) {
        t = t[parts[0]];
        parts.shift();
      }

      if(!Array.isArray(rules[k])) throw new Error('.filter values must be arrays!');

      Object.keys(t[parts[0]])
        .forEach(tK => {
          if(!rules[k].includes(tK)) delete t[parts[0]][tK];
        });
    });
}

function loadNools(projectDir) {
  const simpleNoolsFile = `${projectDir}/rules.nools.js`;
  const noolsTemplateFile = `${projectDir}/rules.nools.template`;

  if(fs.exists(simpleNoolsFile)) {
    return readJs(simpleNoolsFile);
  } else if(fs.exists(noolsTemplateFile)) {
    return cleanJs(fs.read(noolsTemplateFile)
        .replace(/___TEMPLATE:([^_]*)___/g, (_, filename) =>
            fs.read(`${projectDir}/${filename}`)));
  } else {
    throw new Error(`No nools definition file found.  Please create at one of:
	* ${simpleNoolsFile}
	* ${noolsTemplateFile}`);
  }
}
