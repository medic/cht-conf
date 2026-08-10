const convertForms = require('../lib/convert-forms').execute;
const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const { CONTACT_FORMS_PATH } = require('../lib/project-paths');
const { getNode, XPATH_BODY } = require('../lib/forms-utils');

const getBodyGroup = (xmlDoc, ref) => getNode(xmlDoc, `${XPATH_BODY}//group[@ref="${ref}"]`);

/**
 * Renders the contact fields on the init page instead of on a page of their own, by making the
 * <contact> body group the last child of the <init> group. Only the body group is moved: the
 * contact data must stay at /data/contact for the webapp to save the doc correctly.
 */
const moveContactGroupIntoInit = (xmlDoc) => {
  const initGroup = getBodyGroup(xmlDoc, '/data/init');
  const contactGroup = getBodyGroup(xmlDoc, '/data/contact');

  if (initGroup && contactGroup) {
    initGroup.appendChild(contactGroup);
  }
};

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
    domTransformer: moveContactGroupIntoInit,
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
