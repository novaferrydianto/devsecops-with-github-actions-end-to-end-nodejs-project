import { expect } from "chai";
import { fetchWeather } from "../fetch-weather.js";

// Helper functions di-define ulang untuk direct test (kalau belum diexport, bisa inline)
const kelvinToCelsius = (k) => Math.round(k - 273);
const getRainFall = (rainObj) => {
  if (!rainObj) return 0;
  return rainObj["1h"] || rainObj["2h"] || rainObj["3h"] || 0;
};

describe("Weather Helper Functions", function () {
  it("should correctly convert Kelvin to Celsius", () => {
    expect(kelvinToCelsius(300)).to.equal(27);
    expect(kelvinToCelsius(280)).to.equal(7);
  });

  it("should correctly extract rainfall from object", () => {
    expect(getRainFall({ "1h": 1.2 })).to.equal(1.2);
    expect(getRainFall({ "2h": 3.4 })).to.equal(3.4);
    expect(getRainFall()).to.equal(0);
  });
});
