const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const checks = rewire('../../../../src/lib/validation/form/validate-field-paths');
const { createXformDoc, FORM_ID } = require('../../../fn/convert-forms.utils');

describe('Validate field paths', () => {
  const getXmlString = bindNodes => ({
    model: `
      <instance>
        <data id="${FORM_ID}" prefix="J1!${FORM_ID}!" >
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
        </data>
      </instance>
      ${bindNodes.join('\n')}
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
      </group>`
  });

  let bindNodes;
  let xmlDoc;
  let propsData;
  beforeEach(() => {
    bindNodes = [
      '<bind nodeset="/data/inputs/user/contact_id" type="string"/>'
    ];
    xmlDoc = createXformDoc(getXmlString(bindNodes));

    propsData = { 'some_prop': 'some_value' };
  });
  afterEach(sinon.restore);

  it('should handle empty prop data', () => {
    propsData = {};
    return checks.execute({ xmlDoc, propsData })
      .then(output => {
        expect(output.warnings).is.empty;
        expect(output.errors).is.empty;
      });
  });

  it('should handle undefined "field_path_linting" data', () => {
    propsData = {
      field_path_linting: undefined
    };
    return checks.execute({ xmlDoc, propsData })
      .then(output => {
        expect(output.errors).is.empty;
        expect(output.warnings).is.not.empty;
        expect(output.warnings[0]).to.be.equal(
          'If you would like enable form field linting, please ensure the object has the following structure:\n' +
          '"warn_length": "positive integer (optional)"\n' +
          '"error_length": "positive integer (optional)"\n' +
          '"ignore_list": "array of strings representing nodeset paths to ignore (optional)"\n' +
          '"reserved_list": "array of strings representing reserved keywords (optional)"'
        );
      });
  });

  it('should handle empty "field_path_linting" data', () => {
    propsData = {
      field_path_linting: {}
    };
    return checks.execute({ xmlDoc, propsData })
      .then(output => {
        expect(output.errors).is.empty;
        expect(output.warnings).is.not.empty;
        expect(output.warnings[0]).to.be.equal(
          'If you would like enable form field linting, please ensure the object has the following structure:\n' +
          '"warn_length": "positive integer (optional)"\n' +
          '"error_length": "positive integer (optional)"\n' +
          '"ignore_list": "array of strings representing nodeset paths to ignore (optional)"\n' +
          '"reserved_list": "array of strings representing reserved keywords (optional)"'
        );
      });
  });

  it('should pick up var config & throw if "warn_length" is set to a negative value', () => {
    propsData = {
      field_path_linting: {
        warn_length: -1,
        error_length: 0
      }
    };
    return checks.execute({ xmlDoc, propsData })
      .then(output => {
        expect(output.warnings).is.empty;
        expect(output.errors).is.not.empty;
        expect(output.errors[0]).to.be.equal('"warn_length" must be greater than or equal to 0');
      });
  });

  it('should pick up var config & throw if "error_length" is set to a negative value', () => {
    propsData = {
      field_path_linting: {
        warn_length: 0,
        error_length: -1
      }
    };
    return checks.execute({ xmlDoc, propsData })
      .then(output => {
        expect(output.warnings).is.empty;
        expect(output.errors).is.not.empty;
        expect(output.errors[0]).to.be.equal('"error_length" must be greater than or equal to 0');
      });
  });

  it('should pick up var config & skip if warn and error is set to 0', () => {
    propsData = {
      field_path_linting: {
        warn_length: 0,
        error_length: 0
      }
    };
    return checks.execute({ xmlDoc, propsData })
      .then(output => {
        expect(output.warnings).is.empty;
        expect(output.errors).is.empty;
      });
  });

  it('should throw if warn and error has the same value', () => {
    propsData = {
      field_path_linting: {
        warn_length: 1,
        error_length: 1,
      }
    };
    return checks.execute({ xmlDoc, propsData })
      .then(output => {
        expect(output.warnings).is.empty;
        expect(output.errors).is.not.empty;
        expect(output.errors[0]).to.be.equal('"warn_length" must be less than ref:error_length');
      });
  });

  it('should throw if the warn/error lengths contain invalid values', () => {
    propsData = {
      field_path_linting: {
        warn_length: 0.3,
        error_length: '123',
      }
    };
    return checks.execute({ xmlDoc, propsData })
      .then(output => {
        expect(output.warnings).is.empty;
        expect(output.errors).is.not.empty;
        expect(output.errors[0]).to.be.equal('"warn_length" must be an integer');
      });
  });

  it('should correctly warn when warn value is <= var length', () => {
    propsData = {
      field_path_linting: {
        warn_length: 1
      }
    };
    return checks.execute({ xmlDoc, propsData })
      .then(output => {
        expect(output.errors).is.empty;
        expect(output.warnings).is.not.empty;
        expect(output.warnings[0]).to.be.equal(
          'The following vars are longer than the acceptable var length (1):\n' +
          '/inputs/user/contact_id\n' +
          'Please consider simplifying nesting or removing verbosity.'
        );
      });
  });

  it('should correctly throw when error value is <= var length', () => {
    propsData = {
      field_path_linting: {
        error_length: 1,
        warn_length: 0
      }
    };
    return checks.execute({ xmlDoc, propsData })
      .then(output => {
        expect(output.warnings).is.empty;
        expect(output.errors).is.not.empty;
        expect(output.errors[0]).to.be.equal(
          'The following vars are longer than the acceptable var length (1):\n' +
          '/inputs/user/contact_id\n' +
          'Please simplify nesting or remove verbosity.'
        );
      });
  });

  it('should pass when error value is larger than variable length', () => {
    propsData = {
      field_path_linting: {
        warn_length: 23,
        error_length: 24
      }
    };
    return checks.execute({ xmlDoc, propsData })
      .then(output => {
        expect(output.errors).is.empty;
        expect(output.warnings).is.not.empty;
        expect(output.warnings[0]).to.be.equal(
          'The following vars are longer than the acceptable var length (23):\n' +
          '/inputs/user/contact_id\n' +
          'Please consider simplifying nesting or removing verbosity.'
        );
      });
  });

  it('should pass when warn value is larger than variable length', () => {
    propsData = {
      field_path_linting: {
        warn_length: 29,
        error_length: 30
      }
    };
    return checks.execute({ xmlDoc, propsData })
      .then(output => {
        expect(output.warnings).is.empty;
        expect(output.errors).is.empty;
      });
  });

  it('should pass when var is ignored despite provided error value', () => {
    propsData = {
      field_path_linting: {
        error_length: 23,
        warn_length: 0,
        ignore_list: ['/data/inputs/user/contact_id']
      }
    };

    bindNodes.push(
      '<bind nodeset="/data/inputs/user/name" type="string"/>'
    );
    xmlDoc = createXformDoc(getXmlString(bindNodes));

    return checks.execute({ xmlDoc, propsData })
      .then(output => {
        expect(output.warnings).is.empty;
        expect(output.errors).is.empty;
      });
  });

  it('should not throw when ignored item does not exist in xml', () => {
    propsData = {
      field_path_linting: {
        error_length: 0,
        warn_length: 0,
        ignore_list: ['123']
      }
    };
    return checks.execute({ xmlDoc, propsData })
      .then(output => {
        expect(output.warnings).is.empty;
        expect(output.errors).is.empty;
      });
  });

  it('should throw when reserved item exists in xml', () => {
    propsData = {
      field_path_linting: {
        error_length: 30,
        warn_length: 0,
        reserved_list: ['/inputs/user/name']
      }
    };

    bindNodes.push(
      '<bind nodeset="/data/inputs/user/name" type="string"/>'
    );
    xmlDoc = createXformDoc(getXmlString(bindNodes));

    return checks.execute({ xmlDoc, propsData })
      .then(output => {
        expect(output.warnings).is.empty;
        expect(output.errors).is.not.empty;
        expect(output.errors[0]).to.be.equal(
          'The following reserved entries were found in the form:\n' +
          '/inputs/user/name\n' +
          'Please remove or rename as appropriate.'
        );
      });
  });

  it('should throw when ignore list contains invalid entry', () => {
    propsData = {
      field_path_linting: {
        error_length: 30,
        warn_length: 0,
        ignore_list: ['/data/inputs/user/"name`'],
      }
    };

    bindNodes.push(
      '<bind nodeset="/data/inputs/user/name" type="string"/>'
    );
    xmlDoc = createXformDoc(getXmlString(bindNodes));

    return checks.execute({ xmlDoc, propsData })
      .then(output => {
        expect(output.warnings).is.empty;
        expect(output.errors).is.not.empty;
        expect(output.errors[0]).to.be.equal(
          '"ignore_list[0]" with value "/data/inputs/user/"name`" matches the inverted pattern: /[`\'"]/'
        );
      });
  });

  it('should throw when reserved list contains invalid entry', () => {
    propsData = {
      field_path_linting: {
        error_length: 30,
        warn_length: 0,
        reserved_list: ['/data/inputs/user/"name`'],
      }
    };

    bindNodes.push(
      '<bind nodeset="/data/inputs/user/name" type="string"/>'
    );
    xmlDoc = createXformDoc(getXmlString(bindNodes));

    return checks.execute({ xmlDoc, propsData })
      .then(output => {
        expect(output.warnings).is.empty;
        expect(output.errors).is.not.empty;
        expect(output.errors[0]).to.be.equal(
          '"reserved_list[0]" with value "/data/inputs/user/"name`" matches the inverted pattern: /[`\'"]/'
        );
      });
  });

  it('should throw when reserved item is also in the ignore list', () => {
    propsData = {
      field_path_linting: {
        error_length: 30,
        warn_length: 0,
        ignore_list: ['/data/inputs/user/name'],
        reserved_list: ['/data/inputs/user/name']
      }
    };

    bindNodes.push(
      '<bind nodeset="/data/inputs/user/name" type="string"/>'
    );
    xmlDoc = createXformDoc(getXmlString(bindNodes));

    return checks.execute({ xmlDoc, propsData })
      .then(output => {
        expect(output.warnings).is.empty;
        expect(output.errors).is.not.empty;
        expect(output.errors[0]).to.be.equal(
          'Overlap between reserved and ignore lists:\n' +
          '/data/inputs/user/name\n' +
          'Please remove where appropriate.'
        );
      });
  });

  it('should handle when "/data" prefix is NOT part of ignore/reserve list path', () => {
    propsData = {
      field_path_linting: {
        ignore_list: ['/inputs/user/name'],
      }
    };

    bindNodes.push(
      '<bind nodeset="/data/inputs/user/name" type="string"/>'
    );
    xmlDoc = createXformDoc(getXmlString(bindNodes));

    const buildExclusion = sinon.spy(checks.__get__('buildExclusion'));
    checks.__set__('buildExclusion', buildExclusion);
    
    return checks.execute({ xmlDoc, propsData })
      .then(output => {
        expect(output.warnings).is.empty;
        expect(output.errors).is.empty;
        expect(buildExclusion.callCount).to.be.equal(1);
        expect(buildExclusion.args[0][0]).to.be.equal('/inputs/user/name');
        expect(buildExclusion.returnValues[0]).to.be.equal('/data/inputs/user/name');
      });
  });
});
