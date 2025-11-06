/**
 * Updated preparing-data-test.js
 * Modern async/await + mock fetch
 */

import { expect } from "chai";
import sinon from "sinon";
import { fetchWeather } from "../fetch-weather.js";

/* Mock sample API response */
const rawWeatherData = {
  main: { temp_min: 295.15, temp_max: 300.15 },
  rain: { "1h": 0.5 },
  clouds: { all: 75 } // mock cloud cover
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

  it("should process fetched weather data correctly", async () => {
    const result = await fetchWeather("London");

    console.table(result); // 👀 optional: helps visualize during local runs

    expect(result).to.have.keys([
      "minTemp",
      "maxTemp",
      "chanceRain",
      "rainFall",
      "cloudCover",
    ]);
    expect(result.minTemp).to.be.a("number");
    expect(result.maxTemp).to.be.a("number");
    expect(result.cloudCover).to.equal(75); // ✅ fixed expectation
  });
});
