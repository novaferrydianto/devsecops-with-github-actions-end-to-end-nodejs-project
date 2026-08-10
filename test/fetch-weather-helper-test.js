import { expect } from "chai";
import { kelvinToCelsius, getVolume } from "../fetch-weather.js";

describe("Weather Helper Functions", function () {
  describe("kelvinToCelsius", () => {
    it("should correctly convert Kelvin to Celsius", () => {
      expect(kelvinToCelsius(300)).to.equal(27);
      expect(kelvinToCelsius(273.15)).to.equal(0);
      expect(kelvinToCelsius(280)).to.equal(7);
    });
  });

  describe("getVolume (Precipitation Parser)", () => {
    it("should correctly extract volume from object", () => {
      expect(getVolume({ "1h": 1.2 })).to.be.closeTo(1.2, 0.0001);
      expect(getVolume({ "2h": 3.4 })).to.be.closeTo(3.4, 0.0001);
      expect(getVolume({ "3h": 5.6 })).to.be.closeTo(5.6, 0.0001);
    });

    it("should handle JSON strings gracefully", () => {
      expect(getVolume('{"1h": 2.5}')).to.equal(2.5);
    });

    it("should return 0 for invalid JSON or missing data", () => {
      expect(getVolume('invalid-json')).to.equal(0);
      expect(getVolume(null)).to.equal(0);
      expect(getVolume(undefined)).to.equal(0);
      expect(getVolume({})).to.equal(0);
    });
  });
});
