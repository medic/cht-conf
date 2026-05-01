const convertForms = require('../lib/convert-forms').execute;
const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const { CONTACT_FORMS_PATH } = require('../lib/project-paths');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
const { removeNode } = require('../lib/forms-utils');

const convertContactForm = (forms) => {
  const dir = `${environment.pathToProject}/${CONTACT_FORMS_PATH}`;
  const placeTypesJson = `${dir}/place-types.json`;

  let PLACE_TYPES;
  if (fs.exists(placeTypesJson)) {
    PLACE_TYPES = fs.readJson(placeTypesJson);
    Object.keys(PLACE_TYPES)
      .forEach(type => {
        fs.copy(`${dir}/PLACE_TYPE-create.xlsx`, `${dir}/${type}-create.xlsx`, { overwrite: false });
        fs.copy(`${dir}/PLACE_TYPE-edit.xlsx`, `${dir}/${type}-edit.xlsx`, { overwrite: false });
      });
  }

  return convertForms(environment.pathToProject, 'contact', {
    enketo: true,
    forms: forms,
    transformer: (xml, path) => {
      const type = path.replace(/.*\/(.*?)(-(create|edit))?\.xml.swp$/, '$1');

      if (PLACE_TYPES) {
        xml = xml
          .replace(/PLACE_TYPE/g, type)
          .replace(/PLACE_NAME/g, PLACE_TYPES[type]);
      }

      // The ordering of elements in the <model> has an arcane affect on the
      // order that docs are saved in the database when processing a form.
      // Move the main doc's element down to the bottom.
      // For templated PLACE_TYPE forms, shifting must be done _after_ templating.
      if (xml.includes('</inputs>')) {
        let matchedBlock;
        const matcher = new RegExp(`\\s*<${type}>[\\s\\S]*</${type}>\\s*(\\r|\\n)`);

        xml = xml.replace(matcher, match => {
          matchedBlock = match;
          return '\n';
        });

        if (matchedBlock) {
          xml = xml.replace(/<\/inputs>(\r|\n)/, '</inputs>' + matchedBlock);
        }
      }

      if (xml.includes('/data/init/custom_place_name')) {
        let matchedBlock;
        xml = xml.replace(/\s*<input ref="\/data\/init\/custom_place_name">[^]*?<\/input>/, match => {
          matchedBlock = match;
          return '';
        });

        if (matchedBlock) {
          const targetMatcher = new RegExp(`\\s*<input ref="/data/${type}/external_id">\\s*(\\r|\\n)`);
          xml = xml.replace(targetMatcher, match => matchedBlock + match);
        }
      }

      if (xml.includes('ref="/data/contact"')) {
        const domParser = new DOMParser();
        const serializer = new XMLSerializer();
        const doc = domParser.parseFromString(xml, 'text/xml');

        const groups = Array.from(doc.getElementsByTagName('group'));
        const contactGroup = groups.find(g => g.getAttribute('ref') === '/data/contact');
        const initGroup = groups.find(g => g.getAttribute('ref') === '/data/init');

        if (contactGroup && initGroup) {
          removeNode(contactGroup);
          initGroup.appendChild(contactGroup);
          xml = serializer.serializeToString(doc);
        }
      }

      return xml;
    },
  });
};

module.exports = {
  requiresInstance: false,
  convertContactForm,
  CONTACT_FORMS_PATH,
  execute: () => convertContactForm(environment.extraArgs)
};
