/**
 * Created by alicia.sykes on 24/08/2015.
 * Updated for modern Node.js (ESM + DevSecOps)
 */

import 'colors';
import { fetchWeather } from './fetch-weather.js';
import * as prepareForWeather from './prepared-for-the-weather.js';
import commandLineArgs from 'command-line-args';
import http from 'http';

const options = commandLineArgs([
  { name: 'location', alias: 'l', type: String, defaultValue: 'London' }
]);
const location = options.location;

// Fetch weather data
fetchWeather(location)
  .then((today) => {
    const weatherKit = [
      { name: 'Umbrella', value: prepareForWeather.doINeed.umbrella(today) },
      { name: 'Suncream', value: prepareForWeather.doINeed.suncream(today) },
      { name: 'Jumper', value: prepareForWeather.doINeed.jumper(today) },
      { name: 'Water', value: prepareForWeather.doINeed.water(today) },
    ];

    for (const item of weatherKit) {
      printLine(item.value, item.name);
    }

    // ✅ Start a simple HTTP server for DAST/ZAP scans
    startServer();
  })
  .catch((err) => {
    console.error('❌ Failed to fetch weather data:', err.message.red);
    process.exit(1);
  });

// Pretty console output
function printLine(required, text) {
  if (required) console.log(`${String.fromCharCode(10004)} ${text}`.green);
  else console.log(`${String.fromCharCode(10006)} ${text}`.red);
}

// Simple HTTP server for ZAP scan
function startServer() {
  const PORT = process.env.PORT || 3000;
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('✅ Weather app running — ready for ZAP scan!\n');
  });

  server.listen(PORT, () => {
    console.log(`🌦️ App running at http://localhost:${PORT}`.cyan);
  });
}
