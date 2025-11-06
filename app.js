/**
 * Created by alicia.sykes on 24/08/2015.
 * Updated by Nova Ferrydianto (DevSecOps version)
 */

import 'colors';
import { fetchWeather } from './fetch-weather.js';
import * as prepareForWeather from './prepared-for-the-weather.js';
import commandLineArgs from 'command-line-args';

const cli = commandLineArgs([
  { name: 'location', alias: 'l', type: String, defaultValue: 'London' }
]);
const location = cli.parse().location;

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

    // ✅ Start simple HTTP server for ZAP scan
    startServer();
  })
  .catch((err) => {
    console.error('❌ Failed to fetch weather data:', err.message.red);
    process.exit(1);
  });

// Prints console line with icons
function printLine(required, text) {
  if (required) console.log(`${String.fromCharCode(10004)} ${text}`.green);
  else console.log(`${String.fromCharCode(10006)} ${text}`.red);
}

// ✅ Lightweight HTTP server (for DAST)
import http from 'http';
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
