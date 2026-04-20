const convertForms = require('../lib/convert-forms').execute;
const environment = require('../lib/environment');
const { CONTACT_FORMS_PATH } = require('../lib/project-paths');
const { createFormsFromTemplates } = require('../lib/create-forms-from-templates');
const { replaceFormPlaceholderVars } = require('../lib/replace-form-placeholder-vars');

const convertContactForm = (forms) => {
  // Will create the necessary xlsx files based on the conf <entity>-types.json files
  // For now, this only works for contacts but can be extended to work for app forms
  const result = createFormsFromTemplates(environment.pathToProject, CONTACT_FORMS_PATH);

  return convertForms(environment.pathToProject, 'contact', {
    enketo: true,
    forms: forms,
    templateFileNames: result?.templateFileNames,
    transformer: (xml, path, properties) => {
      const type = path.replace(/.*\/(.*?)(-(create|edit))?\.xml.swp$/, '$1');

      xml = replaceFormPlaceholderVars(xml, type, result?.config, properties);

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
        const groupRegex = name => new RegExp(`(\\s*)<group(\\s.*)?\\sref="${name}"(\\s.*)?>[^]*?</group>`);
        let matchedBlock;

        if (xml.match(groupRegex('/data/init'))) {
          xml = xml.replace(groupRegex('/data/contact'), match => {
            matchedBlock = match;
            return '';
          });

          if (matchedBlock) {
            const stripTrailingGroup = s => s.replace(/[\r\n\s]*<\/group>$/, '');
            xml = xml.replace(groupRegex('/data/init'), match => {
              return stripTrailingGroup(match) +
                stripTrailingGroup(matchedBlock).replace(/\n/g, '\n  ') +
                '\n        </group>\n      </group>';
            });
          }
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
