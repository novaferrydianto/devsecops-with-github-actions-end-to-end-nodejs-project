/**
 * Modernized fetch-weather.js
 * Uses node-fetch and async/await
 */

import fetch from "node-fetch";

const APP_ID = "aa0f1b0be45dca476178787f941c76dc";

export async function fetchWeather(location) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${APP_ID}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);

  const body = await res.json();
  return processResults(body);
}

function processResults(allResults) {
  return {
    minTemp: kelvinToCelsius(allResults.main.temp_min),
    maxTemp: kelvinToCelsius(allResults.main.temp_max),
    chanceRain: 0.83, // placeholder for actual rain probability
    rainFall: getRainFall(allResults.rain),
    cloudCover: allResults.clouds.all,
  };
}

function kelvinToCelsius(kTemp) {
  return Math.round(kTemp - 273);
}

function getRainFall(rainObj) {
  if (!rainObj) return 0;
  return rainObj["1h"] || rainObj["2h"] || rainObj["3h"] || 0;
}
