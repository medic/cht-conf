const { expect } = require('chai');
const { DOMParser } = require('@xmldom/xmldom');
const noteCountdownTimer = require('../../../../src/lib/validation/form/note-countdown-timer');

const domParser = new DOMParser();
const xformPath = 'test/form/path.xml';

const getXml = ({ deprecated = false, newStyle = false } = {}) => `
<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <model>
      <instance>
        <data id="test">
          ${deprecated ? '<deprecated_timer>15</deprecated_timer>' : ''}
          ${newStyle ? '<required_timer/>' : ''}
        </data>
      </instance>
      ${deprecated ? '<bind nodeset="/data/deprecated_timer" readonly="true()" type="string"/>' : ''}
      ${newStyle ? '<bind nodeset="/data/required_timer" type="string" required="true()"/>' : ''}
    </model>
  </h:head>
  <h:body>
    ${deprecated
    ? '<input ref="/data/deprecated_timer" appearance="countdown-timer"><label>Deprecated Timer</label></input>' : ''}
    ${newStyle
    ? '<trigger ref="/data/required_timer" appearance="countdown-timer"><label>Required Timer</label></trigger>' : ''}
  </h:body>
</h:html>`;

const getXmlDoc = (opts) => domParser.parseFromString(getXml(opts), 'text/xml');

const LATEST_VERSION = '999.99.99';
const ERROR_HEADER = `Form at ${xformPath} contains fields with the deprecated countdown-timer note appearance. `
  + 'Please update the following fields to use trigger fields instead:';

describe('note-countdown-timer', () => {
  it('resolves OK when no countdown-timer fields present', () => {
    return noteCountdownTimer
      .execute({ xformPath, xmlDoc: getXmlDoc(), apiVersion: LATEST_VERSION })
      .then(({ errors, warnings }) => {
        expect(errors).is.empty;
        expect(warnings).is.empty;
      });
  });

  it('returns warning for deprecated countdown-timer note field', () => {
    return noteCountdownTimer
      .execute({ xformPath, xmlDoc: getXmlDoc({ deprecated: true }), apiVersion: LATEST_VERSION })
      .then(({ errors, warnings }) => {
        expect(errors).is.empty;
        expect(warnings).to.have.length(2);
        expect(warnings[0]).to.equal(ERROR_HEADER);
        expect(warnings[1]).to.equal('  - /data/deprecated_timer');
      });
  });

  it('resolves OK for new trigger style countdown-timer', () => {
    return noteCountdownTimer
      .execute({ xformPath, xmlDoc: getXmlDoc({ newStyle: true }), apiVersion: LATEST_VERSION })
      .then(({ errors, warnings }) => {
        expect(errors).is.empty;
        expect(warnings).is.empty;
      });
  });

  it('returns warning only for deprecated when both deprecated and new style present', () => {
    return noteCountdownTimer
      .execute({ xformPath, xmlDoc: getXmlDoc({ deprecated: true, newStyle: true }), apiVersion: LATEST_VERSION })
      .then(({ errors, warnings }) => {
        expect(errors).is.empty;
        expect(warnings).to.have.length(2);
        expect(warnings[0]).to.equal(ERROR_HEADER);
        expect(warnings[1]).to.equal('  - /data/deprecated_timer');
      });
  });

  it('resolves OK when apiVersion is below 4.7.0', () => {
    return noteCountdownTimer
      .execute({ xformPath, xmlDoc: getXmlDoc({ deprecated: true }), apiVersion: '4.6.0' })
      .then(({ errors, warnings }) => {
        expect(errors).is.empty;
        expect(warnings).is.empty;
      });
  });

  it('resolves OK when no apiVersion provided', () => {
    return noteCountdownTimer
      .execute({ xformPath, xmlDoc: getXmlDoc({ deprecated: true }) })
      .then(({ errors, warnings }) => {
        expect(errors).is.empty;
        expect(warnings).is.empty;
      });
  });

  it('returns warning when apiVersion is exactly 4.7.0', () => {
    return noteCountdownTimer
      .execute({ xformPath, xmlDoc: getXmlDoc({ deprecated: true }), apiVersion: '4.7.0' })
      .then(({ errors, warnings }) => {
        expect(errors).is.empty;
        expect(warnings).to.have.length(2);
        expect(warnings[0]).to.equal(ERROR_HEADER);
        expect(warnings[1]).to.equal('  - /data/deprecated_timer');
      });
  });
});
