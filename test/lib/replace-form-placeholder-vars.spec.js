const sinon = require('sinon');
const { expect } = require('chai');
const { replaceFormPlaceholderVars } = require('../../src/lib/replace-form-placeholder-vars');
const { createXformString } = require('../fn/convert-forms.utils');

describe('Replace form placeholder vars', () => {
  const getXmlString = ({
    placeholderType = 'PLACE_TYPE', 
    placeholderName = 'PLACE_NAME',
    type = null,
    dbLookupType = 'household',
    dbLookupValue = 'some_id_123'
  } = {}) => ({
    model: `
      <instance>
        <data id="placeholder_var_test" prefix="J1!placeholder_var_test!" >
          <inputs>
            <meta>
              <location>
                <lat/>
                <long/>
                <error/>
                <message/>
              </location>
            </meta>
            <user>
              <contact_id/>
              <facility_id/>
              <name/>
            </user>
          </inputs>
          <capture>
            <lookup>
              <_id/>
            </lookup>
            <name/>
          </capture>
          <${type ?? placeholderType}>
            <name/>
          </${type ?? placeholderType}>
        </data>
      </instance>
      <bind nodeset="/data/capture/lookup/_id" type="string" calculate="${dbLookupValue}"/>
      <bind nodeset="/data/${type ?? placeholderType}/name" type="string" calculate="${placeholderName}"/>
    `,
    body: `
      <group appearance="hidden" ref="/data/inputs">
        <group ref="/data/inputs/user">
          <input ref="/data/inputs/user/contact_id">
            <label>NO_LABEL</label>
          </input>
          <input ref="/data/inputs/user/facility_id">
            <label>NO_LABEL</label>
          </input>
          <input ref="/data/inputs/user/name">
            <label>NO_LABEL</label>
          </input>
        </group>
      </group>
      <group appearance="hidden" ref="/data/capture">
        <group appearance="hidden" ref="/data/capture/lookup">
          <input appearance="select-contact type-${dbLookupType}" ref="/data/capture/lookup/_id"/>
        </group>
      </group>
      <group appearance="field-list hidden" ref="/data/${type ?? placeholderType}">
      </group>`
  });

  let xml;
  beforeEach(() => {
    xml = createXformString(getXmlString());
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should handle null values', () => {
    let result;
    expect(() => {
      result = replaceFormPlaceholderVars(xml, null, null, null);
    }).to.not.throw();
    expect(result).to.exist;
    expect(result).to.deep.equal(createXformString(getXmlString()));
  });

  it('should replace old PLACE_TYPE placeholder if type is provided and no properties config', () => {
    let result;
    expect(() => {
      result = replaceFormPlaceholderVars(xml, 'my_type_1', null, null);
    }).to.not.throw();
    expect(result).to.exist;
    expect(!result.includes('PLACE_TYPE')).to.be.true;
    expect(result).to.equal(createXformString(getXmlString({type: 'my_type_1', placeholderName: ''})));
  });

  it('should replace new CONTACT_TYPE placeholder if type is provided and no properties config', () => {
    let result;
    expect(() => {
      result = replaceFormPlaceholderVars(
        createXformString(getXmlString({ placeholderType: 'CONTACT_TYPE' })), 
        'my_type_2', 
        null, 
        null
      );
    }).to.not.throw();
    expect(result).to.exist;
    expect(!result.includes('CONTACT_TYPE')).to.be.true;
    expect(result).to.equal(createXformString(getXmlString({type: 'my_type_2', placeholderName: ''})));
  });

  it('should replace resolve PLACE_NAME placeholder when type and template config is being provided', () => {
    let result;
    expect(() => {
      result = replaceFormPlaceholderVars(xml, 'my_type_3', { 'my_type_3': 'Type name 3' }, null);
    }).to.not.throw();
    expect(result).to.exist;
    expect(!result.includes('PLACE_TYPE')).to.be.true;
    expect(!result.includes('PLACE_NAME')).to.be.true;
    expect(result).to.equal(createXformString(getXmlString({type: 'my_type_3', placeholderName: 'Type name 3'})));
  });

  it('should replace resolve CONTACT_NAME placeholder when type and template config is being provided', () => {
    let result;
    expect(() => {
      result = replaceFormPlaceholderVars(
        createXformString(getXmlString({ placeholderType: 'CONTACT_TYPE', placeholderName: 'CONTACT_NAME' })),
        'my_type_3', 
        { 'my_type_3': { name: 'Type name 3' } }, 
        null
      );
    }).to.not.throw();
    expect(result).to.exist;
    expect(!result.includes('CONTACT_TYPE')).to.be.true;
    expect(!result.includes('CONTACT_NAME')).to.be.true;
    expect(result).to.equal(createXformString(getXmlString({type: 'my_type_3', placeholderName: 'Type name 3'})));
  });

  it('should throw and list vars with invalid syntax', () => {
    expect(() => {
      replaceFormPlaceholderVars(
        createXformString(getXmlString({ 
          placeholderType: 'CONTACT_TYPE', 
          placeholderName: 'CONTACT_NAME',
          dbLookupType: '__cht_var-CONTACT_LOOKUP_TYPE',
          dbLookupValue: '__cht_var-MY_CUSTOM_VARIABLE'
        })),
        'my_type_4', 
        { 'my_type_4': { name: 'Type name 4' } }, 
        { 
          '__cht_var-THROWS_BECAUSE_OF_PREFIX': 'some value',
          'throws_because_of_lowercase': 'some value',
          'IS_FINE': 'some value'
        }
      );
    }).to.throw('The following placeholder vars do not follow the required syntax:\n' +
      '"__cht_var-THROWS_BECAUSE_OF_PREFIX" is not allowed\n' +
      '"throws_because_of_lowercase" is not allowed\n' +
      'Vars only consist of uppercase letters, numbers and underscores ("_")');
  });

  it('should throw when any user defined placeholder vars remain after replacement', () => {
    expect(() => {
      replaceFormPlaceholderVars(
        createXformString(getXmlString({ 
          placeholderType: 'CONTACT_TYPE', 
          placeholderName: 'CONTACT_NAME',
          dbLookupType: '__cht_var-CONTACT_LOOKUP_TYPE',
          dbLookupValue: '__cht_var-MY_CUSTOM_VARIABLE'
        })),
        'my_type_5', 
        { 'my_type_5': { name: 'Type name 5' } }, 
        null
      );
    }).to.throw(
      'The following placeholder vars were NOT replaced:\n' +
      '__cht_var-MY_CUSTOM_VARIABLE\n' + 
      '__cht_var-CONTACT_LOOKUP_TYPE\n' +
      'Please make sure that the key & value for the above are listed in the .properties file'
    );
  });

  it('should replace vars as expected', () => {
    let result;
    expect(() => {
      result = replaceFormPlaceholderVars(
        createXformString(getXmlString({ 
          placeholderType: 'CONTACT_TYPE', 
          placeholderName: 'CONTACT_NAME',
          dbLookupType: '__cht_var-CONTACT_LOOKUP_TYPE',
          dbLookupValue: '__cht_var-MY_CUSTOM_VARIABLE'
        })),
        'my_type_6', 
        { 'my_type_6': { name: 'Type name 6' } }, 
        { 'CONTACT_LOOKUP_TYPE': 'hhm', 'MY_CUSTOM_VARIABLE': 'some_id_123' }
      );
    }).to.not.throw();
    expect(result).to.exist;
    expect(result).to.equal(createXformString(getXmlString({ 
      placeholderType: 'my_type_6', 
      placeholderName: 'Type name 6',
      dbLookupType: 'hhm',
      dbLookupValue: 'some_id_123'
    })));
  });
});
