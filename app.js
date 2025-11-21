/**
 * Created by alicia.sykes on 24/08/2015.
 * Modernized by Nova Ferrydianto (DevSecOps Edition)
 */

import 'colors';
import '@aikidosec/firewall';
import dotenv from 'dotenv';

dotenv.config();

import { fetchWeather } from './fetch-weather.js';
import * as prepareForWeather from './prepared-for-the-weather.js';
import commandLineArgs from 'command-line-args';
import http from 'http';

// 🧩 Parse CLI args
const options = commandLineArgs([
  { name: 'location', alias: 'l', type: String, defaultValue: process.env.DEFAULT_LOCATION || 'London' },
]);

const location = options.location;

// 🚀 Main logic
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

    startServer(today);
  })
  .catch((err) => {
    console.error('❌ Failed to fetch weather data:', err?.message || err);
    process.exit(1);
  });

// 🎨 Helpers
function printLine(required, text) {
  console.log(required ? `✔ ${text}`.green : `✖ ${text}`.red);
}

// 🌐 Basic HTTP server (for DAST / ZAP)
function startServer(today) {
  const PORT = process.env.PORT || 3000;

  const server = http.createServer((req, res) => {
    // Basic security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    if (req.url === '/health') {
      return json(res, { status: 'ok', message: '🛡️ Healthy and secure!' });
    }

    if (req.url === '/weather') {
      return json(res, { location, weather: today });
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('✅ Weather app running — ready for ZAP scan!\n');
  });

  server.listen(PORT, () => {
    console.log(`\n🌦️ App running securely at http://localhost:${PORT}`.yellow);
  });
}

function json(res, obj) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}
