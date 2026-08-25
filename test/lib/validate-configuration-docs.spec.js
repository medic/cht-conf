const { expect } = require('chai');
const { validateBranding, validatePartners } = require('../../src/lib/validate-configuration-docs');

describe('validate-configuration-docs', () => {
  describe('validateBranding', () => {
    const attachments = { 'logo.png': {}, 'favicon.ico': {}, 'icon.svg': {} };

    it('should accept a valid branding config', () => {
      const config = {
        title: 'My App',
        resources: { logo: 'logo.png', favicon: 'favicon.ico', icon: 'icon.svg' },
      };
      expect(validateBranding(config, attachments)).to.deep.equal({ valid: true });
    });

    it('should accept a branding config with only a title', () => {
      expect(validateBranding({ title: 'My App' }, {})).to.deep.equal({ valid: true });
    });

    it('should reject a missing title', () => {
      const result = validateBranding({ resources: { logo: 'logo.png' } }, attachments);
      expect(result.valid).to.be.false;
      expect(result.error).to.include('"title" is required');
    });

    it('should reject a non-string title', () => {
      const result = validateBranding({ title: 42 }, attachments);
      expect(result.valid).to.be.false;
      expect(result.error).to.include('"title" must be a string');
    });

    it('should reject resources that are not an object', () => {
      const result = validateBranding({ title: 'My App', resources: 'logo.png' }, attachments);
      expect(result.valid).to.be.false;
      expect(result.error).to.include('"resources" must be of type object');
    });

    it('should reject unknown resource keys and non-string values', () => {
      const result = validateBranding({ title: 'My App', resources: { logo: 1, banner: 'x.png' } }, attachments);
      expect(result.valid).to.be.false;
      expect(result.error).to.include('"resources.logo" must be a string');
      expect(result.error).to.include('"resources.banner" is not allowed');
    });

    it('should reject resources that reference files missing from the directory', () => {
      const config = { title: 'My App', resources: { logo: 'logo.png', favicon: 'missing.ico' } };
      const result = validateBranding(config, { 'logo.png': {} });
      expect(result.valid).to.be.false;
      expect(result.error).to.equal('"resources.favicon" references "missing.ico" but no such file was found');
    });

    it('should report missing files when there are no attachments at all', () => {
      const result = validateBranding({ title: 'My App', resources: { logo: 'logo.png' } }, undefined);
      expect(result.valid).to.be.false;
      expect(result.error).to.include('"resources.logo" references "logo.png"');
    });
  });

  describe('validatePartners', () => {
    const attachments = { 'partnerA.png': {}, 'partnerB.png': {} };

    it('should accept a valid partners config', () => {
      const config = { resources: { partnerA: 'partnerA.png', partnerB: 'partnerB.png' } };
      expect(validatePartners(config, attachments)).to.deep.equal({ valid: true });
    });

    it('should accept an empty resources object', () => {
      expect(validatePartners({ resources: {} }, {})).to.deep.equal({ valid: true });
    });

    it('should reject a missing resources object', () => {
      const result = validatePartners({}, attachments);
      expect(result.valid).to.be.false;
      expect(result.error).to.include('"resources" is required');
    });

    it('should reject resources that are not an object', () => {
      const result = validatePartners({ resources: ['partnerA.png'] }, attachments);
      expect(result.valid).to.be.false;
      expect(result.error).to.include('"resources" must be of type object');
    });

    it('should reject non-string resource values', () => {
      const result = validatePartners({ resources: { partnerA: { file: 'partnerA.png' } } }, attachments);
      expect(result.valid).to.be.false;
      expect(result.error).to.include('"resources.partnerA" must be a string');
    });

    it('should reject unknown top-level keys', () => {
      const result = validatePartners({ resources: {}, title: 'Partners' }, attachments);
      expect(result.valid).to.be.false;
      expect(result.error).to.include('"title" is not allowed');
    });

    it('should reject resources that reference files missing from the directory', () => {
      const config = { resources: { partnerA: 'partnerA.png', partnerC: 'partnerC.png' } };
      const result = validatePartners(config, attachments);
      expect(result.valid).to.be.false;
      expect(result.error).to.equal('"resources.partnerC" references "partnerC.png" but no such file was found');
    });

    it('should list every missing file', () => {
      const config = { resources: { partnerA: 'a.png', partnerB: 'b.png' } };
      const result = validatePartners(config, {});
      expect(result.valid).to.be.false;
      expect(result.error).to.include('"resources.partnerA" references "a.png"');
      expect(result.error).to.include('"resources.partnerB" references "b.png"');
    });
  });
});
