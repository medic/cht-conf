const { expect } = require('chai');
const { DOMParser } = require('@xmldom/xmldom');

const { compare, GroupingReporter, CompareResult, Difference } = require('../../src/lib/xml-compare');

const parse = (xml) => new DOMParser().parseFromString(xml, 'text/xml');

describe('xml-compare module', () => {
  describe('compare function', () => {
    it('should detect identical documents as equal', () => {
      const expected = parse('<root><child>text</child></root>');
      const actual = parse('<root><child>text</child></root>');

      const result = compare(expected, actual);

      expect(result.getResult()).to.be.true;
      expect(result.getDifferences()).to.have.length(0);
    });

    it('should detect different root element names', () => {
      const expected = parse('<root></root>');
      const actual = parse('<different></different>');

      const result = compare(expected, actual);

      expect(result.getResult()).to.be.false;
      expect(result.getDifferences()).to.have.length.greaterThan(0);
      expect(result.getDifferences()[0].message).to.include('root');
      expect(result.getDifferences()[0].message).to.include('different');
    });

    it('should detect different child element names', () => {
      const expected = parse('<root><child1></child1></root>');
      const actual = parse('<root><child2></child2></root>');

      const result = compare(expected, actual);

      expect(result.getResult()).to.be.false;
      expect(result.getDifferences()[0].message).to.include('child1');
      expect(result.getDifferences()[0].message).to.include('child2');
    });

    it('should detect missing elements', () => {
      const expected = parse('<root><child1></child1><child2></child2></root>');
      const actual = parse('<root><child1></child1></root>');

      const result = compare(expected, actual);

      expect(result.getResult()).to.be.false;
      const hasMissingChild2 = result.getDifferences()
        .some(d => d.message.includes('Missing') && d.message.includes('child2'));
      expect(hasMissingChild2).to.be.true;
    });

    it('should detect extra elements', () => {
      const expected = parse('<root><child1></child1></root>');
      const actual = parse('<root><child1></child1><child2></child2></root>');

      const result = compare(expected, actual);

      expect(result.getResult()).to.be.false;
      const hasUnexpectedChild2 = result.getDifferences()
        .some(d => d.message.includes('Unexpected') && d.message.includes('child2'));
      expect(hasUnexpectedChild2).to.be.true;
    });
  });

  describe('attribute comparison', () => {
    it('should detect missing attributes', () => {
      const expected = parse('<root attr1="value1" attr2="value2"></root>');
      const actual = parse('<root attr1="value1"></root>');

      const result = compare(expected, actual);

      expect(result.getResult()).to.be.false;
      const hasMissingAttr2 = result.getDifferences()
        .some(d => d.message.includes('Missing') && d.message.includes('attr2'));
      expect(hasMissingAttr2).to.be.true;
    });

    it('should detect extra attributes', () => {
      const expected = parse('<root attr1="value1"></root>');
      const actual = parse('<root attr1="value1" attr2="value2"></root>');

      const result = compare(expected, actual);

      expect(result.getResult()).to.be.false;
      const hasUnexpectedAttr2 = result.getDifferences()
        .some(d => d.message.includes('Unexpected') && d.message.includes('attr2'));
      expect(hasUnexpectedAttr2).to.be.true;
    });

    it('should detect different attribute values', () => {
      const expected = parse('<root attr="expected"></root>');
      const actual = parse('<root attr="actual"></root>');

      const result = compare(expected, actual);

      expect(result.getResult()).to.be.false;
      expect(result.getDifferences().some(d =>
        d.message.includes('attr') &&
        d.message.includes('expected') &&
        d.message.includes('actual')
      )).to.be.true;
    });

    it('should handle attributes in different order as equal', () => {
      const expected = parse('<root attr1="a" attr2="b" attr3="c"></root>');
      const actual = parse('<root attr3="c" attr1="a" attr2="b"></root>');

      const result = compare(expected, actual);

      expect(result.getResult()).to.be.true;
    });
  });

  describe('text content comparison', () => {
    it('should detect different text content', () => {
      const expected = parse('<root>expected text</root>');
      const actual = parse('<root>actual text</root>');

      const result = compare(expected, actual);

      expect(result.getResult()).to.be.false;
      expect(result.getDifferences().some(d =>
        d.message.includes('expected text') &&
        d.message.includes('actual text')
      )).to.be.true;
    });

    it('should normalize whitespace in text comparison', () => {
      const expected = parse('<root>  some   text  </root>');
      const actual = parse('<root>some text</root>');

      const result = compare(expected, actual);

      expect(result.getResult()).to.be.true;
    });

    it('should handle empty text nodes', () => {
      const expected = parse('<root></root>');
      const actual = parse('<root></root>');

      const result = compare(expected, actual);

      expect(result.getResult()).to.be.true;
    });

    it('should detect text vs empty difference', () => {
      const expected = parse('<root>some text</root>');
      const actual = parse('<root></root>');

      const result = compare(expected, actual);

      expect(result.getResult()).to.be.false;
    });
  });

  describe('nested structures', () => {
    it('should compare deeply nested elements', () => {
      const expected = parse(`
        <root>
          <level1>
            <level2>
              <level3>deep text</level3>
            </level2>
          </level1>
        </root>
      `);
      const actual = parse(`
        <root>
          <level1>
            <level2>
              <level3>deep text</level3>
            </level2>
          </level1>
        </root>
      `);

      const result = compare(expected, actual);

      expect(result.getResult()).to.be.true;
    });

    it('should detect differences in deeply nested elements', () => {
      const expected = parse(`
        <root>
          <level1>
            <level2>
              <level3>expected</level3>
            </level2>
          </level1>
        </root>
      `);
      const actual = parse(`
        <root>
          <level1>
            <level2>
              <level3>actual</level3>
            </level2>
          </level1>
        </root>
      `);

      const result = compare(expected, actual);

      expect(result.getResult()).to.be.false;
    });

    it('should generate correct XPath for nested differences', () => {
      const expected = parse('<root><child attr="expected"></child></root>');
      const actual = parse('<root><child attr="actual"></child></root>');

      const result = compare(expected, actual);

      const diff = result.getDifferences()[0];
      expect(diff.path).to.include('child');
    });
  });

  describe('edge cases', () => {
    it('should handle empty elements', () => {
      const expected = parse('<root><empty/></root>');
      const actual = parse('<root><empty></empty></root>');

      const result = compare(expected, actual);

      expect(result.getResult()).to.be.true;
    });

    it('should handle self-closing elements', () => {
      const expected = parse('<root><child/></root>');
      const actual = parse('<root><child/></root>');

      const result = compare(expected, actual);

      expect(result.getResult()).to.be.true;
    });

    it('should handle multiple siblings with same name', () => {
      const expected = parse('<root><item>a</item><item>b</item></root>');
      const actual = parse('<root><item>a</item><item>b</item></root>');

      const result = compare(expected, actual);

      expect(result.getResult()).to.be.true;
    });

    it('should detect different order of siblings with same name', () => {
      const expected = parse('<root><item>a</item><item>b</item></root>');
      const actual = parse('<root><item>b</item><item>a</item></root>');

      const result = compare(expected, actual);

      expect(result.getResult()).to.be.false;
    });

    it('should handle special characters in text', () => {
      const expected = parse('<root>&lt;special&gt; &amp; chars</root>');
      const actual = parse('<root>&lt;special&gt; &amp; chars</root>');

      const result = compare(expected, actual);

      expect(result.getResult()).to.be.true;
    });

    it('should handle CDATA sections', () => {
      const expected = parse('<root><![CDATA[some <special> content]]></root>');
      const actual = parse('<root><![CDATA[some <special> content]]></root>');

      const result = compare(expected, actual);

      expect(result.getResult()).to.be.true;
    });
  });

  describe('CompareResult factory', () => {
    it('should return true from getResult() when no differences', () => {
      const result = CompareResult();

      expect(result.getResult()).to.be.true;
      expect(result.getDifferences()).to.deep.equal([]);
    });

    it('should return false from getResult() when differences exist', () => {
      const result = CompareResult();
      result.addDifference('/path', 'message');

      expect(result.getResult()).to.be.false;
    });

    it('should accumulate differences', () => {
      const result = CompareResult();
      result.addDifference('/path1', 'message1');
      result.addDifference('/path2', 'message2');

      expect(result.getDifferences()).to.have.length(2);
    });
  });

  describe('Difference factory', () => {
    it('should store path and message', () => {
      const diff = Difference('/root/child', 'Missing attribute');

      expect(diff.path).to.equal('/root/child');
      expect(diff.message).to.equal('Missing attribute');
    });
  });

  describe('GroupingReporter', () => {
    it('should return empty string for equal documents', () => {
      const expected = parse('<root></root>');
      const actual = parse('<root></root>');

      const result = compare(expected, actual);
      const report = GroupingReporter.report(result);

      expect(report).to.equal('');
    });

    it('should group differences by path', () => {
      const result = CompareResult();
      result.addDifference('/root', 'message1');
      result.addDifference('/root', 'message2');
      result.addDifference('/root/child', 'message3');

      const report = GroupingReporter.report(result);

      expect(report).to.include('/root');
      expect(report).to.include('message1');
      expect(report).to.include('message2');
      expect(report).to.include('/root/child');
      expect(report).to.include('message3');
    });

    it('should format output with indentation', () => {
      const result = CompareResult();
      result.addDifference('/root', 'test message');

      const report = GroupingReporter.report(result);
      const lines = report.split('\n');

      expect(lines[0]).to.equal('/root');
      expect(lines[1]).to.include('\t');
      expect(lines[1]).to.include('test message');
    });
  });

  describe('XForm-like structures', () => {
    it('should handle XForm namespaces', () => {
      const expected = parse(`
        <h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml">
          <h:head>
            <model>
              <instance>
                <data/>
              </instance>
            </model>
          </h:head>
        </h:html>
      `);
      const actual = parse(`
        <h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml">
          <h:head>
            <model>
              <instance>
                <data/>
              </instance>
            </model>
          </h:head>
        </h:html>
      `);

      const result = compare(expected, actual);

      expect(result.getResult()).to.be.true;
    });

    it('should detect differences in XForm structures', () => {
      const expected = parse(`
        <h:html xmlns:h="http://www.w3.org/1999/xhtml">
          <h:head>
            <model>
              <instance>
                <data id="form1"/>
              </instance>
            </model>
          </h:head>
        </h:html>
      `);
      const actual = parse(`
        <h:html xmlns:h="http://www.w3.org/1999/xhtml">
          <h:head>
            <model>
              <instance>
                <data id="form2"/>
              </instance>
            </model>
          </h:head>
        </h:html>
      `);

      const result = compare(expected, actual);

      expect(result.getResult()).to.be.false;
      expect(result.getDifferences().some(d =>
        d.message.includes('id') &&
        d.message.includes('form1') &&
        d.message.includes('form2')
      )).to.be.true;
    });
  });
});
