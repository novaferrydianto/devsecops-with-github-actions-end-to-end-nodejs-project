/**
 * ✅ FINAL CI-STABLE VERSION — fetch-weather.js
 * Works with Mocha + Chai + Sinon + Chai-as-promised (Node ≥18)
 * Fully respects global.fetch stubs in tests.
 */

const APP_ID = process.env.OPENWEATHER_API_KEY;
const configuredTimeout = Number(process.env.OPENWEATHER_TIMEOUT_MS ?? 10000);
const REQUEST_TIMEOUT_MS = Number.isFinite(configuredTimeout) && configuredTimeout > 0
  ? configuredTimeout
  : 10000;

if (!APP_ID) {
  throw new Error("CRITICAL STARTUP ERROR: OPENWEATHER_API_KEY environment variable is missing.");
}

/** Max accepted location length after trim. */
const LOCATION_MAX_LEN = 80;

/**
 * Validate and sanitize a weather location string before it is used in API URLs.
 * Allowlist: Unicode letters/marks, digits, spaces, comma, period, hyphen, apostrophe.
 * @param {unknown} location
 * @returns {string} trimmed safe location
 * @throws {Error} when the location is invalid
 */
export function validateLocation(location) {
  if (typeof location !== 'string') {
    throw new Error('Invalid location: must be a non-empty string');
  }

  const trimmed = location.trim();
  if (!trimmed) {
    throw new Error('Invalid location: must be a non-empty string');
  }

  if (trimmed.length > LOCATION_MAX_LEN) {
    throw new Error(`Invalid location: exceeds maximum length of ${LOCATION_MAX_LEN}`);
  }

  // Reject obvious injection / URL / control patterns early
  if (
    /[\u0000-\u001F\u007F]/.test(trimmed) ||
    /https?:\/\//i.test(trimmed) ||
    /\/\//.test(trimmed) ||
    /@/.test(trimmed)
  ) {
    throw new Error('Invalid location: contains disallowed characters or patterns');
  }

  // Practical city-name allowlist (letters with accents, digits, space, comma, period, hyphen, apostrophe)
  if (!/^[\p{L}\p{M}0-9][\p{L}\p{M}0-9 .,'-]{0,79}$/u.test(trimmed)) {
    throw new Error('Invalid location: only letters, digits, spaces, comma, period, hyphen, and apostrophe are allowed');
  }

  return trimmed;
}

/**
 * Fetch and process weather data
 * @param {string} location
 * @returns {Promise<Object>}
 */
export async function fetchWeather(location) {
  const validated = validateLocation(location);
  // Prefer globalThis.fetch (Node 18+); tests stub global.fetch / globalThis.fetch.
  const fetchFn = globalThis.fetch ?? global.fetch;
  if (typeof fetchFn !== "function") {
    throw new Error(
      "fetch is not available: use Node.js >= 18 or provide globalThis.fetch"
    );
  }
  const safeLocation = encodeURIComponent(validated);
  // Do not log this URL — it contains the API key
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${safeLocation}&appid=${APP_ID}`;

  try {
    const res = await fetchFn(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res?.ok) {
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
