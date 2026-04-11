import { expect, use } from "chai";
import sinon from "sinon";
import chaiAsPromised from "chai-as-promised";
import { fetchWeather } from "../fetch-weather.js";

use(chaiAsPromised);

const mockWeatherData = {
  main: { temp_min: 288.15, temp_max: 290.15 },
  rain: { "1h": 0.5 },
  clouds: { all: 40 },
};

const noRainData = {
  main: { temp_min: 295.15, temp_max: 300.15 },
  clouds: { all: 75 },
};

describe("Weather data processing", function () {
  let fetchStub;

  beforeEach(() => {
    if (fetchStub) fetchStub.restore();
  });

  afterEach(() => {
    if (fetchStub) fetchStub.restore();
  });

  it("should process fetched weather data correctly", async () => {
    fetchStub = sinon.stub(global, "fetch").resolves({
      ok: true,
      json: async () => mockWeatherData,
    });

    const result = await fetchWeather("London");
    console.table(result);

    expect(result).to.include.all.keys([
      "minTemp",
      "maxTemp",
      "chanceRain",
      "rainFall",
      "cloudCover",
    ]);
    expect(result.rainFall).to.equal(0.5);
    expect(result.cloudCover).to.equal(40);
  });

  it("should handle missing rain data gracefully", async () => {
    fetchStub = sinon.stub(global, "fetch").resolves({
      ok: true,
      json: async () => noRainData,
    });

    const result = await fetchWeather("Singapore");
    console.table(result);

    expect(result.rainFall).to.equal(0);
    expect(result.cloudCover).to.equal(75);
  });

  it("should throw an error when API responds with 500", async () => {
    fetchStub = sinon.stub(global, "fetch").rejects({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    await expect(fetchWeather("Tokyo")).to.be.rejectedWith("HTTP error");
  });

  it("should parse snow data correctly from raw Helsinki snapshot", async () => {
    const rawSnow = await import("../test-data/sample-weather-snow-raw.json", { with: { type: "json" } });
    fetchStub = sinon.stub(global, "fetch").resolves({
      ok: true,
      json: async () => rawSnow.default,
    });

    const result = await fetchWeather("Helsinki");
    expect(result.snowFall).to.equal(1.5);
    expect(result.humidity).to.equal(85);
  });

  it("should parse extreme humidity from Jakarta snapshot", async () => {
    const rawHumid = await import("../test-data/sample-weather-humid-raw.json", { with: { type: "json" } });
    fetchStub = sinon.stub(global, "fetch").resolves({
      ok: true,
      json: async () => rawHumid.default,
    });

    const result = await fetchWeather("Jakarta");
    expect(result.humidity).to.equal(95);
    expect(result.rainFall).to.equal(0);
    expect(result.snowFall).to.equal(0);
  });
});
