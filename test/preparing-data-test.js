/**
 * preparing-data-test.js (Final)
 * Complete unit test for fetchWeather()
 * Covers success, missing field, and error scenarios.
 */

import { expect } from "chai";
import sinon from "sinon";
import { fetchWeather } from "../fetch-weather.js";

const rawWeatherData = {
  main: { temp_min: 295.15, temp_max: 300.15 }, // 22–27°C
  rain: { "1h": 0.5 },
  clouds: { all: 40 },
};

describe("Weather data processing", function () {
  let fetchStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, "fetch").resolves({
      ok: true,
      json: async () => rawWeatherData,
    });
  });

  afterEach(() => fetchStub.restore());

  it("✅ should process fetched weather data correctly", async () => {
    const result = await fetchWeather("London");

    console.table(result);

    expect(result).to.have.keys([
      "minTemp",
      "maxTemp",
      "chanceRain",
      "rainFall",
      "cloudCover",
    ]);
    expect(result.minTemp).to.be.a("number");
    expect(result.maxTemp).to.be.a("number");
    expect(result.rainFall).to.equal(0.5);
    expect(result.cloudCover).to.equal(40);
  });

  it("✅ should handle missing rain data gracefully", async () => {
    fetchStub.restore();
    sinon.stub(global, "fetch").resolves({
      ok: true,
      json: async () => ({
        main: { temp_min: 290.15, temp_max: 295.15 },
        clouds: { all: 75 },
      }),
    });

    const result = await fetchWeather("Jakarta");
    expect(result.rainFall).to.equal(0);
    expect(result.cloudCover).to.equal(75);
    global.fetch.restore();
  });

  it("✅ should throw an error when API responds with 500", async () => {
    fetchStub.restore();
    sinon.stub(global, "fetch").resolves({
      ok: false,
      status: 500,
    });

    try {
      await fetchWeather("Nowhere");
      expect.fail("Expected fetchWeather() to throw");
    } catch (err) {
      expect(err.message).to.include("HTTP error");
    } finally {
      global.fetch.restore();
    }
  });
});
