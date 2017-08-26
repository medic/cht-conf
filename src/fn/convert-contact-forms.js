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
        return !PLACE_TYPES ? xml : xml
            .replace(/PLACE_TYPE/g, type)
            .replace(/PLACE_NAME/g, PLACE_TYPES[type]);
      },
    });

};
