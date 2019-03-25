const chai = require('chai');
<<<<<<< HEAD
const { expect, assert } = chai;
chai.use(require('chai-shallow-deep-equal'));

const { runNoolsLib } = require('../run-lib');
=======
const assert = chai.assert;
chai.use(require('chai-shallow-deep-equal'));
>>>>>>> 5493-persist
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
<<<<<<< HEAD
=======
  loadLibWith,
>>>>>>> 5493-persist
} = require('./mocks');

describe('nools lib', function() {
  beforeEach(() => reset());

  describe('test setup', function() {
    it('should successfully parse the lib', function() {
      // given
      const emptyConfig = { c:{}, targets:[] };

      // when
<<<<<<< HEAD
      const lib = runNoolsLib(emptyConfig);
=======
      const lib = loadLibWith(emptyConfig);
>>>>>>> 5493-persist

      // then
      assert.isNotNull(lib);
    });

    it('should emit completed signal', function() {
      // given
      const emptyConfig = { c:{}, targets:[] };

      // when
<<<<<<< HEAD
      const emitted = runNoolsLib(emptyConfig).emitted;
=======
      const emitted = loadLibWith(emptyConfig).emitted;
>>>>>>> 5493-persist

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
<<<<<<< HEAD
        const emitted = runNoolsLib(config).emitted;
=======
        const emitted = loadLibWith(config).emitted;
>>>>>>> 5493-persist

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
<<<<<<< HEAD
        const emitted = runNoolsLib(config).emitted;
=======
        const emitted = loadLibWith(config).emitted;
>>>>>>> 5493-persist

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
<<<<<<< HEAD
        const emitted = runNoolsLib(config).emitted;
=======
        const emitted = loadLibWith(config).emitted;
>>>>>>> 5493-persist

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
<<<<<<< HEAD
        contact.contact.reported_date = reportedDate;
=======
        contact.reported_date = reportedDate;
>>>>>>> 5493-persist

        // and
        const config = {
          c: contact,
          targets: [ target ],
          tasks: [],
        };

        // when
<<<<<<< HEAD
        const emitted = runNoolsLib(config).emitted;
=======
        const emitted = loadLibWith(config).emitted;
>>>>>>> 5493-persist

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
<<<<<<< HEAD
        const emitted = runNoolsLib(config).emitted;
=======
        const emitted = loadLibWith(config).emitted;
>>>>>>> 5493-persist

        // then
        assert.deepEqual(emitted, [
          { _id: 'c-2~pT-1', _type:'target', date:TEST_DATE },
          { _type:'_complete', _id:true },
        ]);
      });
<<<<<<< HEAD

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
=======
>>>>>>> 5493-persist
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
<<<<<<< HEAD
        const emitted = runNoolsLib(config).emitted;
=======
        const emitted = loadLibWith(config).emitted;
>>>>>>> 5493-persist

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
<<<<<<< HEAD
        const emitted = runNoolsLib(config).emitted;
=======
        const emitted = loadLibWith(config).emitted;
>>>>>>> 5493-persist

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
<<<<<<< HEAD
        const emitted = runNoolsLib(config).emitted;
=======
        const emitted = loadLibWith(config).emitted;
>>>>>>> 5493-persist

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
<<<<<<< HEAD
          const emitted = runNoolsLib(config).emitted;
=======
          const emitted = loadLibWith(config).emitted;
>>>>>>> 5493-persist

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
<<<<<<< HEAD
          const emitted = runNoolsLib(config).emitted;

          // then
          assert.deepEqual(emitted, [
            { _type:'target', _id:'c-2~rT-3', date: TEST_DATE },
=======
          const emitted = loadLibWith(config).emitted;

          // then
          assert.deepEqual(emitted, [
            { _type:'target', _id:'c-2~rT-3' },
>>>>>>> 5493-persist
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
<<<<<<< HEAD
          const emitted = runNoolsLib(config).emitted;

          // then
          assert.deepEqual(emitted, [
            { _type:'target', _id:'c-4~rT-5', date: TEST_DATE },
            { _type:'target', _id:'c-4~rT-5', date: TEST_DATE },
            { _type:'target', _id:'c-4~rT-5', date: TEST_DATE },
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
=======
          const emitted = loadLibWith(config).emitted;

          // then
          assert.deepEqual(emitted, [
            { _type:'target', _id:'c-4~rT-5' },
            { _type:'target', _id:'c-4~rT-5' },
            { _type:'target', _id:'c-4~rT-5' },
            { _type:'_complete', _id:true },
          ]);
        });
>>>>>>> 5493-persist
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
<<<<<<< HEAD
          const emitted = runNoolsLib(config).emitted;
=======
          const emitted = loadLibWith(config).emitted;
>>>>>>> 5493-persist

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
<<<<<<< HEAD
          const emitted = runNoolsLib(config).emitted;

          // then
          assert.deepEqual(emitted, [
            { _type:'target', _id:'c-2~rT-3', date: TEST_DATE },
            { _type:'target', _id:'c-2~rT-4', date: TEST_DATE },
=======
          const emitted = loadLibWith(config).emitted;

          // then
          assert.deepEqual(emitted, [
            { _type:'target', _id:'c-2~rT-3' },
            { _type:'target', _id:'c-2~rT-4' },
>>>>>>> 5493-persist
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
<<<<<<< HEAD
          const emitted = runNoolsLib(config).emitted;

          // then
          assert.deepEqual(emitted, [
            { _type:'target', _id:'c-4~rT-5', date: TEST_DATE },
            { _type:'target', _id:'c-4~rT-5', date: TEST_DATE },
            { _type:'target', _id:'c-4~rT-5', date: TEST_DATE },
            { _type:'target', _id:'c-4~rT-6', date: TEST_DATE },
            { _type:'target', _id:'c-4~rT-6', date: TEST_DATE },
            { _type:'target', _id:'c-4~rT-6', date: TEST_DATE },
=======
          const emitted = loadLibWith(config).emitted;

          // then
          assert.deepEqual(emitted, [
            { _type:'target', _id:'c-4~rT-5' },
            { _type:'target', _id:'c-4~rT-5' },
            { _type:'target', _id:'c-4~rT-5' },
            { _type:'target', _id:'c-4~rT-6' },
            { _type:'target', _id:'c-4~rT-6' },
            { _type:'target', _id:'c-4~rT-6' },
>>>>>>> 5493-persist
            { _type:'_complete', _id:true },
          ]);
        });
      });
    });
<<<<<<< HEAD

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

=======
>>>>>>> 5493-persist
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
<<<<<<< HEAD
        assert.throws(function() { runNoolsLib(config); }, Error, "unrecognised target type: unknown");
=======
        assert.throws(function() { loadLibWith(config); }, Error,
          "Error: unrecognised target type: unknown");
>>>>>>> 5493-persist
      });
    });
  });
});
