const convertForms = require('../lib/convert-forms');
const fs = require('../lib/sync-fs');

module.exports = (projectDir, couchUrl, extras) => {

  const dir = `${projectDir}/forms/contact`;
  const placeTypesJson = `${dir}/place-types.json`;

  let PLACE_TYPES;
  if(fs.exists(placeTypesJson)) {
    PLACE_TYPES = fs.readJson(placeTypesJson);
    Object.keys(PLACE_TYPES)
      .forEach(type => {
        fs.copy(`${dir}/PLACE_TYPE-create.xlsx`, `${dir}/${type}-create.xlsx`);
        fs.copy(`${dir}/PLACE_TYPE-edit.xlsx`, `${dir}/${type}-edit.xlsx`);
      });
  }

  return convertForms(projectDir, 'contact', {
      enketo: true,
      force_data_node: 'data',
      forms: extras,
      transformer: (xml, path) => {
        const type = path.replace(/.*\/(.*)-(create|edit)\.xml/, '$1');

        if(PLACE_TYPES) {
          xml = xml
              .replace(/PLACE_TYPE/g, type)
              .replace(/PLACE_NAME/g, PLACE_TYPES[type]);
        }

        // The ordering of elements in the <model> has an arcane affect on the
        // order that docs are saved in the database when processing a form.
        // Move the main doc's element down to the bottom.
        // For templated PLACE_TYPE forms, shifting must be done _after_ templating.
        if(xml.includes('</inputs>')) {
          let matchedBlock;
          const matcher = new RegExp(`\\s*<${type}>[\\s\\S]*</${type}>\\s*(\\r|\\n)`);

          xml = xml.replace(matcher, match => {
            matchedBlock = match;
            return '\n';
          });

          if(matchedBlock) {
            xml = xml.replace(/<\/inputs>(\r|\n)/, '</inputs>' + matchedBlock);
          }
        }

        return xml;
      },
    });

};
