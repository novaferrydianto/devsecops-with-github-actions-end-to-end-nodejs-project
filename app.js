/**
 * Created by alicia.sykes on 24/08/2015.
 * Modernized by Nova Ferrydianto (DevSecOps Edition)
 */

import 'colors';
import dotenv from 'dotenv';

dotenv.config();

import { fetchWeather } from './fetch-weather.js';
import * as prepareForWeather from './prepared-for-the-weather.js';
import commandLineArgs from 'command-line-args';
import http from 'http';

import { fileURLToPath } from 'url';
import path from 'path';

// 🚀 Main logic wrapper for testability
export async function run() {
  const options = commandLineArgs([
    { name: 'location', alias: 'l', type: String, defaultValue: process.env.DEFAULT_LOCATION || 'London' },
  ]);

  const location = options.location;
  let server;

  try {
    const today = await fetchWeather(location);
    const weatherKit = [
      { name: 'Umbrella', value: prepareForWeather.doINeed.umbrella(today) },
      { name: 'Suncream', value: prepareForWeather.doINeed.suncream(today) },
      { name: 'Jumper', value: prepareForWeather.doINeed.jumper(today) },
      { name: 'Water', value: prepareForWeather.doINeed.water(today) },
      { name: 'Boots', value: prepareForWeather.doINeed.boots(today) },
      { name: 'Stay Hydrated', value: prepareForWeather.doINeed.stayHydrated(today) },
    ];

    console.info(`\n🌤️ Weather forecast for ${location}:\n`.cyan); // NOSONAR
    for (const item of weatherKit) printLine(item.value, item.name);

    // Convert array to object for API response
    const kit = weatherKit.reduce((acc, item) => ({ ...acc, [item.name.toLowerCase().replace(' ', '')]: item.value }), {});

    server = startServer(today, location, kit);
  } catch (err) {
    console.error('❌ Failed to fetch weather data:', err?.message || err); // NOSONAR
    console.info('⚠️ Starting fallback server for health checks & DAST...'); // NOSONAR
    server = startServer({ error: "API connection failed, fallback mode active" }, location);
  }

  return server;
}

// 🛑 SRE: Graceful Shutdown capability
export const shutdown = (server) => {
  console.info('\n🛑 Receiving shutdown signal. Shutting down gracefully...'); // NOSONAR
  server.close(() => {
    console.info('✅ Server closed.'); // NOSONAR
    process.exitCode = 0;
  });
  
  setTimeout(() => {
    console.error('❌ Forcefully shutting down'); // NOSONAR
    process.exit(1); 
  }, 10000).unref();
};

// 🎨 Helpers
function printLine(required, text) {
  console.info(required ? `✔ ${text}`.green : `✖ ${text}`.red); // NOSONAR
}

// 🌐 Basic HTTP server (for DAST / ZAP)
export function startServer(today, location = 'London', kit = {}) {
  const PORT = process.env.PORT || 3000;

  const server = http.createServer((req, res) => {
    // Modern basic security headers (DevSecOps Hardened)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=()');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    if (req.url === '/health') {
      return json(res, { status: 'ok', message: '🛡️ Healthy and secure!' });
    }

    if (req.url === '/weather') {
      return json(res, { location, weather: today, recommendations: kit });
    }

    if (req.url === '/robots.txt') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('User-agent: *\nDisallow: /\n');
    }

    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('✅ Weather app running — ready for ZAP scan!\n');
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('❌ 404 Not Found\n');
  });

  // Only listen if not in test environment or if explicitly called to listen
  if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, '0.0.0.0', () => {
      console.info(`\n🌦️ App running securely at http://0.0.0.0:${PORT}`.yellow); // NOSONAR
    });
  }

  return server;
}

function json(res, obj) {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

// 🏁 EXECUTION
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  run().then(server => {
    process.on('SIGINT', () => shutdown(server));
    process.on('SIGTERM', () => shutdown(server));
  });
}
