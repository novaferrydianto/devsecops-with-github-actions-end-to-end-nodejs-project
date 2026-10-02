/**
 * Created by alicia.sykes on 24/08/2015.
 * Modernized by Nova Ferrydianto (DevSecOps Edition)
 */

import { createRequire } from 'node:module';
import { timingSafeEqual } from 'node:crypto';
import { fetchWeather, validateLocation } from './fetch-weather.js';
import * as prepareForWeather from './prepared-for-the-weather.js';
import commandLineArgs from 'command-line-args';
import { readFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Optional local .env — production images inject env via orchestrator (no dotenv dep).
if (process.env.NODE_ENV !== 'production') {
  try {
    const require = createRequire(import.meta.url);
    require('dotenv').config();
  } catch {
    // dotenv is dev-only; missing in pruned production installs is expected.
  }
}

// 🚀 Main logic wrapper for testability
export async function run() {
  const options = commandLineArgs([
    { name: 'location', alias: 'l', type: String, defaultValue: process.env.DEFAULT_LOCATION || 'London' },
  ]);

  let location;
  let server;

  try {
    location = validateLocation(options.location);
  } catch (err) {
    console.error('❌ Invalid location:', err?.message || err); // NOSONAR
    console.info('⚠️ Starting fallback server for health checks & DAST...'); // NOSONAR
    location = 'London';
    server = startServer({ error: 'Invalid location' }, location);
    return server;
  }

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

    console.info(`\n🌤️ Weather forecast for ${location}:\n`); // NOSONAR
    for (const item of weatherKit) printLine(item.value, item.name);

    // Convert array to object for API response
    const kit = weatherKit.reduce((acc, item) => ({ ...acc, [item.name.toLowerCase().replace(' ', '')]: item.value }), {});

    server = startServer(today, location, kit);
  } catch (err) {
    console.error('❌ Failed to fetch weather data:', err?.message || err); // NOSONAR
    console.info('⚠️ Starting fallback server for health checks & DAST...'); // NOSONAR
    server = startServer({ error: 'API connection failed, fallback mode active' }, location);
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
  console.info(required ? `✔ ${text}` : `✖ ${text}`); // NOSONAR
}

function parsePositiveInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

/**
 * Constant-time string compare for API tokens (length mismatch → false).
 * @param {string} provided
 * @param {string} expected
 */
function safeTokenEqual(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Still run a compare against itself so timing stays roughly flat on length mismatch.
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

/**
 * Extract bearer / API key from Authorization or X-API-Key headers.
 * @param {import('node:http').IncomingMessage} req
 * @returns {string|null}
 */
function extractApiToken(req) {
  const apiKey = req.headers['x-api-key'];
  if (typeof apiKey === 'string' && apiKey.trim()) {
    return apiKey.trim();
  }
  const auth = req.headers.authorization;
  if (typeof auth === 'string') {
    const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

/** Max raw request URL length (path + query) before rejecting with 414. */
const MAX_REQUEST_URL_LENGTH = 2048;

/**
 * Normalize request path: strip query/hash, decode safely, collapse //, reject traversal.
 * @param {string|undefined} rawUrl
 * @returns {{ ok: true, path: string } | { ok: false, code: 400 | 414 }}
 */
export function normalizeRequestPath(rawUrl) {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0) {
    return { ok: false, code: 400 };
  }
  if (rawUrl.length > MAX_REQUEST_URL_LENGTH) {
    return { ok: false, code: 414 };
  }

  // Drop query string and fragment before path checks.
  const withoutQuery = rawUrl.split(/[?#]/, 1)[0];
  let decoded;
  try {
    decoded = decodeURIComponent(withoutQuery);
  } catch {
    return { ok: false, code: 400 };
  }

  if (decoded.includes('\0')) {
    return { ok: false, code: 400 };
  }

  // Reject path traversal and backslash tricks early.
  if (decoded.includes('..') || decoded.includes('\\')) {
    return { ok: false, code: 400 };
  }

  // Collapse repeated slashes; ensure leading slash.
  let pathName = decoded.replace(/\/{2,}/g, '/');
  if (!pathName.startsWith('/')) {
    pathName = `/${pathName}`;
  }
  // Strip trailing slash except root
  if (pathName.length > 1 && pathName.endsWith('/')) {
    pathName = pathName.slice(0, -1);
  }

  return { ok: true, path: pathName };
}

/**
 * In-memory fixed-window rate limiter (per remote address).
 * RATE_LIMIT_MAX=0 disables. In NODE_ENV=test, defaults to disabled unless options/env set.
 * /health is always exempt so probes stay healthy.
 */
function createRateLimiter({ windowMs, max }) {
  const hits = new Map();

  return {
    check(key) {
      if (!max || max <= 0) return { allowed: true, retryAfterSec: 0 };
      const now = Date.now();
      let bucket = hits.get(key);
      if (!bucket || now >= bucket.resetAt) {
        bucket = { count: 0, resetAt: now + windowMs };
        hits.set(key, bucket);
      }
      bucket.count += 1;
      if (bucket.count > max) {
        return {
          allowed: false,
          retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
        };
      }
      return { allowed: true, retryAfterSec: 0 };
    },
    reset() {
      hits.clear();
    },
  };
}

// 🌐 Basic HTTP/HTTPS server (for DAST / ZAP)
export function startServer(today, location = 'London', kit = {}, options = {}) {
  const PORT = process.env.PORT || 3000;
  const HOST = process.env.HOST || process.env.BIND_ADDRESS || '0.0.0.0';
  const noStore = 'no-store, no-cache, must-revalidate, proxy-revalidate';

  const defaultMax = process.env.NODE_ENV === 'test' ? 0 : 120;
  const rateLimitWindowMs = options.rateLimitWindowMs
    ?? parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000);
  const rateLimitMax = options.rateLimitMax
    ?? parsePositiveInt(process.env.RATE_LIMIT_MAX, defaultMax);
  const rateLimiter = createRateLimiter({ windowMs: rateLimitWindowMs, max: rateLimitMax });

  // Optional shared secret for /weather. Empty/unset = open (local + DAST default).
  const weatherApiToken = (options.apiToken ?? process.env.WEATHER_API_TOKEN ?? '').trim();

  const handleRequest = (req, res) => {
    // Modern basic security headers (DevSecOps Hardened)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=()');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    const method = (req.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      res.setHeader('Cache-Control', noStore);
      res.setHeader('Allow', 'GET, HEAD');
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(method === 'HEAD' ? undefined : 'Method Not Allowed\n');
    }

    const normalized = normalizeRequestPath(req.url);
    if (!normalized.ok) {
      res.setHeader('Cache-Control', noStore);
      const status = normalized.code;
      const message = status === 414 ? 'URI Too Long\n' : 'Bad Request\n';
      res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(method === 'HEAD' ? undefined : message);
    }
    const routePath = normalized.path;

    // Rate limit (exempt health probes)
    if (routePath !== '/health') {
      const clientKey = req.socket?.remoteAddress || 'unknown';
      const { allowed, retryAfterSec } = rateLimiter.check(clientKey);
      if (!allowed) {
        res.setHeader('Cache-Control', noStore);
        res.setHeader('Retry-After', String(retryAfterSec));
        res.writeHead(429, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(method === 'HEAD' ? undefined : 'Too Many Requests\n');
      }
    }

    if (routePath === '/health') {
      res.setHeader('Cache-Control', noStore);
      return json(res, { status: 'ok', message: '🛡️ Healthy and secure!' }, method);
    }

    if (routePath === '/weather') {
      res.setHeader('Cache-Control', noStore);
      if (weatherApiToken) {
        const provided = extractApiToken(req);
        if (!provided || !safeTokenEqual(provided, weatherApiToken)) {
          res.setHeader('WWW-Authenticate', 'Bearer realm="weather"');
          res.writeHead(401, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end(method === 'HEAD' ? undefined : 'Unauthorized\n');
        }
      }
      return json(res, { location, weather: today, recommendations: kit }, method);
    }

    if (routePath === '/robots.txt') {
      res.setHeader('Cache-Control', noStore);
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(method === 'HEAD' ? undefined : 'User-agent: *\nDisallow: /\n');
    }

    if (routePath === '/') {
      res.setHeader('Cache-Control', noStore);
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(method === 'HEAD' ? undefined : '✅ Weather app running — ready for ZAP scan!\n');
    }

    res.setHeader('Cache-Control', noStore);
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(method === 'HEAD' ? undefined : '❌ 404 Not Found\n');
  };

  const tlsOptions = loadTlsOptions();
  const protocol = tlsOptions ? 'https' : 'http';
  const server = tlsOptions
    ? https.createServer(tlsOptions, handleRequest)
    : http.createServer(handleRequest);

  // Bound slowloris / stalled clients (Node http.Server timeouts).
  const headersTimeoutMs = parsePositiveInt(process.env.HEADERS_TIMEOUT_MS, 15_000);
  const requestTimeoutMs = parsePositiveInt(process.env.REQUEST_TIMEOUT_MS, 30_000);
  const keepAliveTimeoutMs = parsePositiveInt(process.env.KEEP_ALIVE_TIMEOUT_MS, 5_000);
  server.headersTimeout = headersTimeoutMs;
  server.requestTimeout = requestTimeoutMs;
  server.keepAliveTimeout = keepAliveTimeoutMs;
  server.timeout = Math.max(requestTimeoutMs, headersTimeoutMs) + 1_000;

  // Test helper: reset buckets between cases
  server.resetRateLimit = () => rateLimiter.reset();

  // Only listen if not in test environment or if explicitly called to listen
  if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, HOST, () => {
      console.info(`\n🌦️ App running securely at ${protocol}://${HOST}:${PORT}`); // NOSONAR
    });
  }

  return server;
}

export function loadTlsOptions(env = process.env, readFile = readFileSync) {
  const certPath = env.TLS_CERT_PATH?.trim();
  const keyPath = env.TLS_KEY_PATH?.trim();

  if (!certPath && !keyPath) {
    return undefined;
  }
  if (!certPath || !keyPath) {
    throw new Error('TLS_CERT_PATH and TLS_KEY_PATH must be set together');
  }

  return {
    cert: readFile(certPath),
    key: readFile(keyPath),
    minVersion: 'TLSv1.2',
  };
}

function json(res, obj, method = 'GET') {
  const body = JSON.stringify(obj);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.writeHead(200);
  if (method === 'HEAD') {
    return res.end();
  }
  res.end(body);
}

// 🏁 EXECUTION
/* c8 ignore start */
const isDirectRun = process.argv[1]
  && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isDirectRun) {
  const server = await run();
  if (server) {
    process.on('SIGINT', () => shutdown(server));
    process.on('SIGTERM', () => shutdown(server));
  }
}
/* c8 ignore stop */
