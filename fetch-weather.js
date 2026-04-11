/**
 * ✅ FINAL CI-STABLE VERSION — fetch-weather.js
 * Works with Mocha + Chai + Sinon + Chai-as-promised (Node ≥18)
 * Fully respects global.fetch stubs in tests.
 */

const APP_ID = process.env.OPENWEATHER_API_KEY;

if (!APP_ID) {
  throw new Error("CRITICAL STARTUP ERROR: OPENWEATHER_API_KEY environment variable is missing.");
}

/**
 * Fetch and process weather data
 * @param {string} location
 * @returns {Promise<Object>}
 */
export async function fetchWeather(location) {
  const fetchFn = global.fetch || (await import("node-fetch")).default;
  const safeLocation = encodeURIComponent(location);
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${safeLocation}&appid=${APP_ID}`;

  try {
    const res = await fetchFn(url);
    if (!res || !res.ok) {
      throw new Error(`HTTP error! Status: ${res?.status ?? "Unknown"}`);
    }

    const body = await res.json();
    return processResults(body);
  } catch (err) {
    throw new Error(`HTTP error: ${err.status || err.message || "Unknown error"}`);
  }
}

function processResults(allResults) {
  return {
    minTemp: kelvinToCelsius(allResults?.main?.temp_min ?? 0),
    maxTemp: kelvinToCelsius(allResults?.main?.temp_max ?? 0),
    chanceRain: 0.83,
    rainFall: getVolume(allResults?.rain),
    snowFall: getVolume(allResults?.snow),
    humidity: allResults?.main?.humidity ?? 0,
    cloudCover: allResults?.clouds?.all ?? 0,
  };
}

export function kelvinToCelsius(kTemp) {
  return Math.round(kTemp - 273);
}

export function getVolume(obj) {
  if (!obj) return 0;
  if (typeof obj === "string") {
    try {
      return getVolume(JSON.parse(obj));
    } catch {
      return 0;
    }
  }

  for (const key of ["1h", "2h", "3h"]) {
    const val = Number(obj[key]);
    if (!Number.isNaN(val)) return val;
  }

  return 0;
}
