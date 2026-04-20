const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');
const templateHelper = rewire('../../src/lib/create-forms-from-templates');

describe('Create forms from templates', () => {
  let exists;
  let readJson;
  let copy;
  let warn;
  beforeEach(() => {
    readJson = sinon.stub();
    exists = sinon.stub();
    copy = sinon.stub();
    warn = sinon.stub();

    templateHelper.__set__('fs', { exists, readJson, copy });
    templateHelper.__set__('warn', warn);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should handle null values', () => {
    let result;
    expect(() => {
      result = templateHelper.createFormsFromTemplates();
    }).to.not.throw();
    expect(result).to.exist;
    expect(result.config).to.not.exist;
    expect(exists.callCount).to.be.equal(2);
    expect(exists.getCall(0).args[0]).to.be.equal('undefined/undefined/place-types.json');
    expect(exists.getCall(1).args[0]).to.be.equal('undefined/undefined/contact-types.json');
    expect(result.templateFileNames).to.exist;
    expect(result.templateFileNames.size).to.be.equal(2);
    expect([...result.templateFileNames]).to.deep.equal([
      'PLACE_TYPE-create.xlsx', 
      'PLACE_TYPE-edit.xlsx'
    ]);
  });

  it('should correctly set contact config load paths', () => {
    let result;
    expect(() => {
      result = templateHelper.createFormsFromTemplates('some_dir', 'contact');
    }).to.not.throw();
    expect(result).to.exist;
    expect(result.config).to.not.exist;
    expect(exists.callCount).to.be.equal(2);
    expect(exists.getCall(0).args[0]).to.be.equal('some_dir/contact/place-types.json');
    expect(exists.getCall(1).args[0]).to.be.equal('some_dir/contact/contact-types.json');
  });

  it('should throw if unable to load json config file', () => {
    exists = sinon.stub().returns(true);
    readJson = sinon.stub().throws({message: 'Permission issue'});
    templateHelper.__set__('fs', { exists, readJson, copy });

    let result;
    expect(() => {
      result = templateHelper.createFormsFromTemplates('some_dir', 'contact');
    }).to.throw(`Unable to read "some_dir/contact/place-types.json" json file contents: Permission issue`);
    expect(result).to.not.exist;
    expect(exists.callCount).to.be.equal(1);
    expect(exists.getCall(0).args[0]).to.be.equal('some_dir/contact/place-types.json');
    expect(exists.returned(true)).to.be.true;
  });

  it('should throw if both the place-types.json AND contact-types.json exists', () => {
    exists = sinon.stub().returns(true);
    readJson.onCall(0).returns({ place_types: 'contents' });
    readJson.onCall(1).returns({ contact_types: 'contents' });
    templateHelper.__set__('fs', { exists, readJson, copy });

    let result;
    expect(() => {
      result = templateHelper.createFormsFromTemplates('some_dir', 'contact');
    }).to.throw('Can not have both place-types.json AND contact-types.json template config');
    expect(result).to.not.exist;
    expect(exists.callCount).to.be.equal(2);
    expect(exists.getCall(0).args[0]).to.be.equal('some_dir/contact/place-types.json');
    expect(exists.getCall(1).args[0]).to.be.equal('some_dir/contact/contact-types.json');
    expect(exists.returned(true)).to.be.true;
    expect(readJson.callCount).to.be.equal(2);
    expect(readJson.getCall(0).args[0]).to.be.equal('some_dir/contact/place-types.json');
    expect(readJson.getCall(1).args[0]).to.be.equal('some_dir/contact/contact-types.json');
  });

  it('should throw when unable to copy file', () => {
    exists = sinon.stub();
    exists.onCall(0).returns(true);
    exists.onCall(1).returns(false);
    readJson.onCall(0).returns({ 'my_type_1': 'Type 1' });
    readJson.onCall(1).returns(null);
    copy = sinon.stub().throws({message: 'Permission issue'});
    templateHelper.__set__('fs', { exists, readJson, copy });

    let result;
    expect(() => {
      result = templateHelper.createFormsFromTemplates('some_dir', 'contact');
    }).to.throw('Unable to write "my_type_1-create.xlsx" to disk: Permission issue');
    expect(result).to.not.exist;
    expect(exists.callCount).to.be.equal(2);
    expect(exists.getCall(0).args[0]).to.be.equal('some_dir/contact/place-types.json');
    expect(exists.getCall(1).args[0]).to.be.equal('some_dir/contact/contact-types.json');
    expect(exists.getCall(0).returned(true)).to.be.true;
    expect(exists.getCall(1).returned(false)).to.be.true;
    expect(readJson.callCount).to.be.equal(1);
    expect(readJson.getCall(0).args[0]).to.be.equal('some_dir/contact/place-types.json');
    expect(warn.calledOnce).to.be.true;
    expect(warn.calledWith(
      '[DEPRECATED] The use of "place-types.json" is deprecated. Please use "contact-types.json" instead. ' +
      'This new format provides greater flexibility for template configuration, including support for: ' +
      'person templates, multiple templates per place or person, and conditional edit form creation.'
    )).to.be.true;
    expect(copy.callCount).to.be.equal(1);
  });

  it('should process the deprecated place-types.json correctly', () => {
    exists = sinon.stub();
    exists.onCall(0).returns(true);
    exists.onCall(1).returns(false);
    readJson.onCall(0).returns({ 'my_type_1': 'Type 1', 'my_type_2': 'Type 2' });
    readJson.onCall(1).returns(null);
    templateHelper.__set__('fs', { exists, readJson, copy });

    let result;
    expect(() => {
      result = templateHelper.createFormsFromTemplates('some_dir', 'contact');
    }).to.not.throw();
    expect(result).to.exist;
    expect(result.config).to.exist;
    expect(exists.callCount).to.be.equal(2);
    expect(exists.getCall(0).args[0]).to.be.equal('some_dir/contact/place-types.json');
    expect(exists.getCall(1).args[0]).to.be.equal('some_dir/contact/contact-types.json');
    expect(exists.getCall(0).returned(true)).to.be.true;
    expect(exists.getCall(1).returned(false)).to.be.true;
    expect(readJson.callCount).to.be.equal(1);
    expect(readJson.getCall(0).args[0]).to.be.equal('some_dir/contact/place-types.json');
    expect(warn.calledOnce).to.be.true;
    expect(warn.calledWith(
      '[DEPRECATED] The use of "place-types.json" is deprecated. Please use "contact-types.json" instead. ' +
      'This new format provides greater flexibility for template configuration, including support for: ' +
      'person templates, multiple templates per place or person, and conditional edit form creation.'
    )).to.be.true;
    expect(copy.callCount).to.be.equal(4);
    expect(copy.getCall(0).args).to.deep.equal([
      'some_dir/contact/PLACE_TYPE-create.xlsx', 
      `some_dir/contact/my_type_1-create.xlsx`, 
      { overwrite: false }
    ]);
    expect(copy.getCall(1).args).to.deep.equal([
      'some_dir/contact/PLACE_TYPE-edit.xlsx', 
      `some_dir/contact/my_type_1-edit.xlsx`, 
      { overwrite: false }
    ]);
    expect(copy.getCall(2).args).to.deep.equal([
      'some_dir/contact/PLACE_TYPE-create.xlsx', 
      `some_dir/contact/my_type_2-create.xlsx`, 
      { overwrite: false }
    ]);
    expect(copy.getCall(3).args).to.deep.equal([
      'some_dir/contact/PLACE_TYPE-edit.xlsx', 
      `some_dir/contact/my_type_2-edit.xlsx`, 
      { overwrite: false }
    ]);
    expect(result.templateFileNames).to.exist;
    expect(result.templateFileNames.size).to.be.equal(2);
    expect([...result.templateFileNames]).to.deep.equal([
      'PLACE_TYPE-create.xlsx', 
      'PLACE_TYPE-edit.xlsx'
    ]);
  });

  it('should process the contact-types.json correctly', () => {
    exists = sinon.stub();
    exists.onCall(0).returns(false);
    exists.onCall(1).returns(true);
    readJson.onCall(0).returns(contactTypesConfig);
    templateHelper.__set__('fs', { exists, readJson, copy });

    let result;
    expect(() => {
      result = templateHelper.createFormsFromTemplates('some_dir', 'contact');
    }).to.not.throw();
    expect(result).to.exist;
    expect(result.config).to.exist;
    expect(exists.callCount).to.be.equal(2);
    expect(exists.getCall(0).args[0]).to.be.equal('some_dir/contact/place-types.json');
    expect(exists.getCall(1).args[0]).to.be.equal('some_dir/contact/contact-types.json');
    expect(exists.getCall(0).returned(false)).to.be.true;
    expect(exists.getCall(1).returned(true)).to.be.true;
    expect(readJson.callCount).to.be.equal(1);
    expect(readJson.getCall(0).args[0]).to.be.equal('some_dir/contact/contact-types.json');
    expect(warn.callCount).to.be.equal(0);
    expect(copy.callCount).to.be.equal(18); // Not 20 due to 2 types opting out of edit forms
    const entries = Object.entries(contactTypesConfig).entries();
    
    let moveUp = 0;
    for (const [index, [key, value]] of entries){
      const { templateCreate, templateEdit } = value;
      
      expect(copy.getCall(index + moveUp).args).to.deep.equal([
        `some_dir/contact/${templateCreate}`, 
        `some_dir/contact/${key}-create.xlsx`, 
        { overwrite: false }
      ]);
      if((templateEdit)){
        expect(copy.getCall(index + moveUp +1).args).to.deep.equal([
          `some_dir/contact/${templateEdit}`, 
          `some_dir/contact/${key}-edit.xlsx`,
          { overwrite: false }
        ]);
        moveUp += 1;
      }
    }
    expect(result.templateFileNames.size).to.be.equal(7);
    expect([...result.templateFileNames]).to.deep.equal([
      'CONTACT_TYPE_1-create.xlsx', 
      'CONTACT_TYPE_1-edit.xlsx',
      'CONTACT_TYPE_2-create.xlsx', 
      'CONTACT_TYPE_2-edit.xlsx',
      'CONTACT_TYPE_3-create.xlsx', 
      'CONTACT_TYPE_3-edit.xlsx',
      'CONTACT_TYPE_4-create.xlsx',
    ]);
  });

  it('should throw when the contact-types.json config does not match the expected schema', () => {
    exists = sinon.stub();
    exists.onCall(0).returns(false);
    exists.onCall(1).returns(true);
    const somethingWrong = {...contactTypesConfig, 123: 'some value', 'test': { 'inner': 'validation' } };
    readJson.onCall(0).returns(somethingWrong);
    templateHelper.__set__('fs', { exists, readJson, copy });

    let result;
    expect(() => {
      result = templateHelper.createFormsFromTemplates('some_dir', 'contact');
    }).to.throw(
      'contact_types.json config does not have the required structure: \n' + 
      '"123" must be of type object\n' + 
      '"test.name" is required\n' +
      '"test.templateCreate" is required\n' +
      '"test.inner" is not allowed'
    );
    expect(result).to.not.exist;
  });

  const contactTypesConfig = {
    nation: {
      name: 'Nation',
      templateCreate: 'CONTACT_TYPE_1-create.xlsx',
      templateEdit: 'CONTACT_TYPE_1-edit.xlsx',
    },
    region: {
      name: 'Region',
      templateCreate: 'CONTACT_TYPE_1-create.xlsx',
      templateEdit: 'CONTACT_TYPE_1-edit.xlsx',
    },
    district: {
      name: 'District',
      templateCreate: 'CONTACT_TYPE_1-create.xlsx',
      templateEdit: 'CONTACT_TYPE_1-edit.xlsx',
    },
    supervisor_area: {
      name: 'Supervisor Area',
      templateCreate: 'CONTACT_TYPE_2-create.xlsx',
      templateEdit: 'CONTACT_TYPE_2-edit.xlsx',
    },
    chw_area: {
      name: 'CHW Area',
      templateCreate: 'CONTACT_TYPE_2-create.xlsx',
      templateEdit: 'CONTACT_TYPE_2-edit.xlsx',
    },
    national_admin: {
      name: 'National Admin',
      templateCreate: 'CONTACT_TYPE_3-create.xlsx',
      templateEdit: 'CONTACT_TYPE_3-edit.xlsx',
    },
    regional_admin: {
      name: 'Regional Admin',
      templateCreate: 'CONTACT_TYPE_3-create.xlsx',
      templateEdit: 'CONTACT_TYPE_3-edit.xlsx',
    },
    district_admin: {
      name: 'District Admin',
      templateCreate: 'CONTACT_TYPE_3-create.xlsx',
      templateEdit: 'CONTACT_TYPE_3-edit.xlsx',
    },
    supervisor: {
      name: 'Supervisor',
      templateCreate: 'CONTACT_TYPE_4-create.xlsx',
    },
    chw: {
      name: 'CHW',
      templateCreate: 'CONTACT_TYPE_4-create.xlsx',
    }
  };
});
