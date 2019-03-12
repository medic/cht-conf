const chai = require('chai');
const { expect, assert } = chai;
chai.use(require('chai-shallow-deep-equal'));
const {
  TEST_DATE,
  reset,
  aPersonBasedTarget,
  aPlaceBasedTarget,
  aReportBasedTarget,
  aReport,
  personWithoutReports,
  personWithReports,
  placeWithoutReports,
  placeWithReports,
  aRandomTimestamp,
  loadLibWith,
} = require('./mocks');

describe('nools lib', function() {
  beforeEach(() => reset());

  describe('test setup', function() {
    it('should successfully parse the lib', function() {
      // given
      const emptyConfig = { c:{}, targets:[] };

      // when
      const lib = loadLibWith(emptyConfig);

      // then
      assert.isNotNull(lib);
    });

    it('should emit completed signal', function() {
      // given
      const emptyConfig = { c:{}, targets:[] };

      // when
      const emitted = loadLibWith(emptyConfig).emitted;

      // then
      assert.deepEqual(emitted, [ { _type:'_complete', _id:true } ]);
    });
  });

  describe('targets', function() {
    describe('person-based', function() {
      it('should emit once for a person with no reports', function() {
        // given
        const config = {
          c: personWithoutReports(),
          targets: [ aPersonBasedTarget() ],
          tasks: [],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _id: 'c-1~pT-2', _type:'target', date: TEST_DATE },
          { _type:'_complete', _id:true },
        ]);
      });
      it('should emit once for a person with one report', function() {
        // given
        const config = {
          c: personWithReports(aReport()),
          targets: [ aPersonBasedTarget() ],
          tasks: [],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.deepEqual(emitted, [
          {_id: 'c-2~pT-3', _type:'target', date:TEST_DATE },
          { _type:'_complete', _id:true },
        ]);
      });
      it('should emit once for a person with multiple reports', function() {
        // given
        const config = {
          c: personWithReports(aReport(), aReport(), aReport()),
          targets: [ aPersonBasedTarget() ],
          tasks: [],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _id: 'c-4~pT-5', _type:'target', date:TEST_DATE },
          { _type:'_complete', _id:true },
        ]);
      });
      it('should allow "reported" as target date', function() {
        // given
        const target = aPersonBasedTarget();
        target.date = 'reported';
        // and
        const reportedDate = aRandomTimestamp();
        const contact = personWithoutReports();
        contact.reported_date = reportedDate;

        // and
        const config = {
          c: contact,
          targets: [ target ],
          tasks: [],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _id: 'c-2~pT-1', _type:'target', date: reportedDate },
          { _type:'_complete', _id:true },
        ]);
      });

      it('should allow "now" as target date', function() {
        // given
        const target = aPersonBasedTarget();
        target.date = 'now';
        // and
        const config = {
          c: personWithoutReports(),
          targets: [ target ],
          tasks: [],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _id: 'c-2~pT-1', _type:'target', date:TEST_DATE },
          { _type:'_complete', _id:true },
        ]);
      });

      it('should not emit if appliesToType doesnt match', function() {
        // given
        const target = aPersonBasedTarget();
        target.appliesToType = [ 'dne' ];

        const config = {
          c: personWithReports(aReport()),
          targets: [ target ],
          tasks: [],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        expect(emitted).to.have.property('length', 1);
      });
    });

    describe('place-based', function() {
      it('should emit once for a place with no reports', function() {
        // given
        const config = {
          c: placeWithoutReports(),
          targets: [ aPlaceBasedTarget() ],
          tasks: [],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _id: 'c-1~plT-2', _type:'target', date:TEST_DATE },
          { _type:'_complete', _id:true },
        ]);
      });
      it('should emit once for a place with one report', function() {
        // given
        const config = {
          c: placeWithReports(aReport()),
          targets: [ aPlaceBasedTarget() ],
          tasks: [],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _id: 'c-2~plT-3', _type:'target', date:TEST_DATE },
          { _type:'_complete', _id:true },
        ]);
      });
      it('should emit once for a place with multiple reports', function() {
        // given
        const config = {
          c: placeWithReports(aReport(), aReport(), aReport()),
          targets: [ aPlaceBasedTarget() ],
          tasks: [],
        };

        // when
        const emitted = loadLibWith(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _id: 'c-4~plT-5', _type:'target', date:TEST_DATE },
          { _type:'_complete', _id:true },
        ]);
      });
    });

    describe('report-based', function() {
      describe('with a single target', function() {
        it('should not emit for person with no reports', function() {
          // given
          const config = {
            c: personWithoutReports(aReport()),
            targets: [ aReportBasedTarget() ],
            tasks: [],
          };

          // when
          const emitted = loadLibWith(config).emitted;

          // then
          assert.deepEqual(emitted, [
            { _type:'_complete', _id:true },
          ]);
        });
        it('should emit once for person with once report', function() {
          // given
          const config = {
            c: personWithReports(aReport()),
            targets: [ aReportBasedTarget() ],
            tasks: [],
          };

          // when
          const emitted = loadLibWith(config).emitted;

          // then
          assert.deepEqual(emitted, [
            { _type:'target', _id:'c-2~rT-3' },
            { _type:'_complete', _id:true },
          ]);
        });
        it('should emit once per report for person with multiple reports', function() {
          // given
          const config = {
            c: personWithReports(aReport(), aReport(), aReport()),
            targets: [ aReportBasedTarget() ],
            tasks: [],
          };

          // when
          const emitted = loadLibWith(config).emitted;

          // then
          assert.deepEqual(emitted, [
            { _type:'target', _id:'c-4~rT-5' },
            { _type:'target', _id:'c-4~rT-5' },
            { _type:'target', _id:'c-4~rT-5' },
            { _type:'_complete', _id:true },
          ]);
        });

        it('should not emit if appliesToType doesnt match', function() {
          // given
          const target = aReportBasedTarget();
          target.appliesToType = [ 'dne' ];

          const config = {
            c: personWithReports(aReport()),
            targets: [ target ],
            tasks: [],
          };

          // when
          const emitted = loadLibWith(config).emitted;

          // then
          expect(emitted).to.have.property('length', 1);
        });
      });

      describe('with multiple targets', function() {
        it('should not emit for person with no reports', function() {
          // given
          const config = {
            c: personWithoutReports(aReport()),
            targets: [ aReportBasedTarget(), aReportBasedTarget() ],
            tasks: [],
          };

          // when
          const emitted = loadLibWith(config).emitted;

          // then
          assert.deepEqual(emitted, [
            { _type:'_complete', _id:true },
          ]);
        });
        it('should emit once per report for person with one report', function() {
          // given
          const config = {
            c: personWithReports(aReport()),
            targets: [ aReportBasedTarget(), aReportBasedTarget() ],
            tasks: [],
          };

          // when
          const emitted = loadLibWith(config).emitted;

          // then
          assert.deepEqual(emitted, [
            { _type:'target', _id:'c-2~rT-3' },
            { _type:'target', _id:'c-2~rT-4' },
            { _type:'_complete', _id:true },
          ]);
        });
        it('should emit once per report for person with multiple reports', function() {
          // given
          const config = {
            c: personWithReports(aReport(), aReport(), aReport()),
            targets: [ aReportBasedTarget(), aReportBasedTarget() ],
            tasks: [],
          };

          // when
          const emitted = loadLibWith(config).emitted;

          // then
          assert.deepEqual(emitted, [
            { _type:'target', _id:'c-4~rT-5' },
            { _type:'target', _id:'c-4~rT-5' },
            { _type:'target', _id:'c-4~rT-5' },
            { _type:'target', _id:'c-4~rT-6' },
            { _type:'target', _id:'c-4~rT-6' },
            { _type:'target', _id:'c-4~rT-6' },
            { _type:'_complete', _id:true },
          ]);
        });
      });
    });

    it('appliesToType is optional', function() {
      // given
      const target = aPersonBasedTarget();
      delete target.appliesToType;
      
      const config = {
        c: personWithReports(aReport()),
        targets: [ target ],
        tasks: [],
      };

      // when
      const emitted = loadLibWith(config).emitted;

      // then
      assert.deepEqual(emitted, [
        { _id: 'c-3~pT-1', _type:'target', date: TEST_DATE },
        { _type:'_complete', _id:true },
      ]);
    });

    describe('invalid target type', function() {
      it('should throw error', function() {
        // given
        const invalidTarget = aReportBasedTarget();
        invalidTarget.appliesTo = 'unknown';

        const config = {
          c: personWithReports(aReport()),
          targets: [ invalidTarget ],
          tasks: [],
        };

        // throws
        assert.throws(function() { loadLibWith(config); }, Error,
          "Error: unrecognised target type: unknown");
      });
    });
  });
});
