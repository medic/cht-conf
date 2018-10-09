const assert = require('chai').assert;
const utils = require('../../src/lib/translation-file-utils');

describe('parse translation property files', () => {
	const dataDir = `data/upload-custom-translations`;

  it('should parse property file correctly', () =>
		assert.deepEqual(utils.propertiesAsObject(`${dataDir}/standard.properties`),{ key: '{VISITS, plural, one{visite} other{visites}}' }));

	it('should parse property file with exra equal sign(s) correctly', () =>
		assert.deepEqual(utils.propertiesAsObject(`${dataDir}/with-extra-equals.properties`),{ key: '{VISITS, plural, =1{visite} other{visites}}' }));
	
		it('should correctly parse a property not parse a  property file ', () =>
		assert.deepEqual(utils.propertiesAsObject(`${dataDir}/wrong.properties`),{}));
});