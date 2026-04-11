/**
 * Fuzz Tests using fast-check (Property-Based Testing)
 * Required by OSSF Scorecard "Fuzzing" check for JavaScript projects.
 *
 * These tests feed random/unexpected data into core functions
 * to detect crashes, hangs, or unexpected behavior.
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';
import fc from 'fast-check';
import { doINeed } from '../prepared-for-the-weather.js';

describe('🔀 Fuzz Testing (fast-check)', function () {
  this.timeout(10000);

  describe('doINeed.umbrella', () => {
    it('should never throw on arbitrary numeric input', () => {
      fc.assert(
        fc.property(fc.float(), (rainFall) => {
          const result = doINeed.umbrella({ rainFall });
          expect(result).to.be.a('boolean');
        }),
        { numRuns: 500 }
      );
    });

    it('should return true only when rainFall > 0', () => {
      fc.assert(
        fc.property(fc.float({ min: Math.fround(0.01), max: Math.fround(1000) }), (rainFall) => {
          expect(doINeed.umbrella({ rainFall })).to.equal(true);
        }),
        { numRuns: 200 }
      );
    });
  });

  describe('doINeed.suncream', () => {
    it('should never throw on arbitrary weather data', () => {
      fc.assert(
        fc.property(fc.float(), fc.float(), (maxTemp, cloudCover) => {
          const result = doINeed.suncream({ maxTemp, cloudCover });
          expect(result).to.be.a('boolean');
        }),
        { numRuns: 500 }
      );
    });
  });

  describe('doINeed.jumper', () => {
    it('should never throw on arbitrary temperature', () => {
      fc.assert(
        fc.property(fc.float({ min: Math.fround(-50), max: Math.fround(60) }), (minTemp) => {
          const result = doINeed.jumper({ minTemp });
          expect(result).to.be.a('boolean');
        }),
        { numRuns: 500 }
      );
    });

    it('should return true when temperature is below 15', () => {
      fc.assert(
        fc.property(fc.float({ min: Math.fround(-50), max: Math.fround(14.99) }), (minTemp) => {
          expect(doINeed.jumper({ minTemp })).to.equal(true);
        }),
        { numRuns: 200 }
      );
    });
  });

  describe('doINeed.water', () => {
    it('should always return true regardless of input', () => {
      fc.assert(
        fc.property(fc.anything(), (data) => {
          expect(doINeed.water(data)).to.equal(true);
        }),
        { numRuns: 500 }
      );
    });
  });

  describe('Resilience: malformed input objects', () => {
    it('should handle undefined/null properties gracefully', () => {
      fc.assert(
        fc.property(
          fc.record({
            rainFall: fc.oneof(fc.float(), fc.constant(undefined), fc.constant(null)),
            maxTemp: fc.oneof(fc.float(), fc.constant(undefined), fc.constant(null)),
            minTemp: fc.oneof(fc.float(), fc.constant(undefined), fc.constant(null)),
            cloudCover: fc.oneof(fc.float(), fc.constant(undefined), fc.constant(null)),
          }),
          (weatherData) => {
            // None of these should throw
            expect(() => doINeed.umbrella(weatherData)).to.not.throw();
            expect(() => doINeed.suncream(weatherData)).to.not.throw();
            expect(() => doINeed.jumper(weatherData)).to.not.throw();
            expect(() => doINeed.water(weatherData)).to.not.throw();
          }
        ),
        { numRuns: 500 }
      );
    });
  });
});
