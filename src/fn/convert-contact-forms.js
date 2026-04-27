const convertForms = require('../lib/convert-forms').execute;
const environment = require('../lib/environment');
const { CONTACT_FORMS_PATH } = require('../lib/project-paths');
const { createFormsFromTemplates } = require('../lib/create-forms-from-templates');
const { replaceFormPlaceholderVars } = require('../lib/replace-form-placeholder-vars');

const handleInputs = (xml, type) => {
  if (!xml.includes('</inputs>')) {
    return xml;
  }

  let matchedBlock;
  const matcher = new RegExp(`\\s*<${type}>[\\s\\S]*</${type}>\\s*(\\r|\\n)`);

  xml = xml.replace(matcher, match => {
    matchedBlock = match;
    return '\n';
  });

  if (matchedBlock) {
    xml = xml.replace(/<\/inputs>(\r|\n)/, '</inputs>' + matchedBlock);
  }
  
  return xml;
};

const handleCustomPlaceName = (xml, type) => {
  if (!xml.includes('/data/init/custom_place_name')) {
    return xml;
  }

  let matchedBlock;
  xml = xml.replace(/\s*<input ref="\/data\/init\/custom_place_name">[^]*?<\/input>/, match => {
    matchedBlock = match;
    return '';
  });

  if (matchedBlock) {
    const targetMatcher = new RegExp(`\\s*<input ref="/data/${type}/external_id">\\s*(\\r|\\n)`);
    xml = xml.replace(targetMatcher, match => matchedBlock + match);
  }
  
  return xml;
};

const handleContact = (xml) => {
  if (!xml.includes('ref="/data/contact"')) {
    return xml;
  }

  const groupRegex = name => new RegExp(`(\\s*)<group(\\s.*)?\\sref="${name}"(\\s.*)?>[^]*?</group>`);
  let matchedBlock;

  if (!xml.match(groupRegex('/data/init'))) {
    return xml;
  }

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
 
  return xml;
};

const convertContactForm = (forms) => {
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
      xml = handleInputs(xml, type);
      xml = handleCustomPlaceName(xml, type);
      xml = handleContact(xml);

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
