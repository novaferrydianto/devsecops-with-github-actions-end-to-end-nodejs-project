/**
 * Created by alicia.sykes on 24/08/2015.
 * Updated for modern Node.js (ESM + DevSecOps by Nova Ferrydianto)
 */

import 'colors';
import dotenv from 'dotenv';
dotenv.config();

import { fetchWeather } from './fetch-weather.js';
import * as prepareForWeather from './prepared-for-the-weather.js';
import commandLineArgs from 'command-line-args';
import http from 'http';

// ✅ Optional: Lightweight runtime protection (RASP)
import '@aikidosec/firewall';

// 🧩 Command line args
const options = commandLineArgs([
  { name: 'location', alias: 'l', type: String, defaultValue: process.env.DEFAULT_LOCATION || 'London' },
]);
const location = options.location;

// 🚀 Fetch weather and process recommendations
fetchWeather(location)
  .then((today) => {
    const weatherKit = [
      { name: 'Umbrella', value: prepareForWeather.doINeed.umbrella(today) },
      { name: 'Suncream', value: prepareForWeather.doINeed.suncream(today) },
      { name: 'Jumper', value: prepareForWeather.doINeed.jumper(today) },
      { name: 'Water', value: prepareForWeather.doINeed.water(today) },
    ];

    console.log(`\n🌤️ Weather forecast for ${location}:\n`.cyan);
    for (const item of weatherKit) printLine(item.value, item.name);

    // ✅ Start HTTP server for OWASP ZAP scans
    startServer(today);
  })
  .catch((err) => {
    console.error('❌ Failed to fetch weather data:'.red, err.message);
    process.exit(1);
  });

// 🎨 Pretty CLI output
function printLine(required, text) {
  if (required) console.log(`✔ ${text}`.green);
  else console.log(`✖ ${text}`.red);
}

// 🌐 Simple server for DAST/ZAP scanning
function startServer(today) {
  const PORT = process.env.PORT || 3000;
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', message: '🛡️ Healthy and secure!' }));
      return;
    }

    if (req.url === '/weather') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ location: location, weather: today }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('✅ Weather app running — ready for ZAP scan!\n');
  });

  server.listen(PORT, () => {
    console.log(`\n🌦️ App running securely at http://localhost:${PORT}`.yellow);
  });
}