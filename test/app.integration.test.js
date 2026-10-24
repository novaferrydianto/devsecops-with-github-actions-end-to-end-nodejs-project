import request from 'supertest';
import { expect } from 'chai';
import { loadTlsOptions, normalizeRequestPath, startServer } from '../app.js';

describe('🚀 Integration Test: app.js', () => {
    let server;
    const mockWeatherData = { 
        minTemp: -5,
        maxTemp: 2,
        rainFall: 0,
        snowFall: 5,
        humidity: 80,
        cloudCover: 100
    };

    const mockKit = { boots: true, water: true, stayhydrated: false };

    before(() => {
        // Start server in test mode (no real listen)
        server = startServer(mockWeatherData, 'Helsinki', mockKit);
    });

    after((done) => {
        if (server && server.listening) {
            server.close(done);
        } else {
            done();
        }
    });

    describe('🌐 Endpoints', () => {
        it('should return 200 OK for the root path', async () => {
            const res = await request(server).get('/');
            expect(res.status).to.equal(200);
            expect(res.text).to.contain('ready for ZAP scan');
        });

        it('should return 200 OK and health status for /health', async () => {
            const res = await request(server).get('/health');
            expect(res.status).to.equal(200);
            expect(res.body.status).to.equal('ok');
        });

        it('should return 200 OK for /robots.txt with strict policy', async () => {
            const res = await request(server).get('/robots.txt');
            expect(res.status).to.equal(200);
            expect(res.text).to.contain('Disallow: /');
        });

        it('should return 200 OK and complete weather data for /weather', async () => {
            const res = await request(server).get('/weather');
            expect(res.status).to.equal(200);
            expect(res.body.location).to.equal('Helsinki');
            expect(res.body.weather.snowFall).to.equal(5);
            expect(res.body.recommendations.boots).to.equal(true);
            expect(res.body.recommendations.water).to.equal(true);
        });

        it('should return 404 for unknown routes', async () => {
            const res = await request(server).get('/unknown-path');
            expect(res.status).to.equal(404);
        });

        it('should reject path traversal and overlong URLs', async () => {
            // Percent-encode ".." so SuperAgent/http clients do not resolve the path before send.
            const traversal = await request(server).get('/..%2fetc/passwd');
            expect(traversal.status).to.equal(400);

            const overlong = await request(server).get(`/${'a'.repeat(2100)}`);
            expect(overlong.status).to.equal(414);

            // Query strings are ignored for routing — path still matches.
            const withQuery = await request(server).get('/health?probe=1');
            expect(withQuery.status).to.equal(200);
        });

        it('should reject non-GET methods with 405 and Allow header', async () => {
            const resWeather = await request(server).post('/weather');
            expect(resWeather.status).to.equal(405);
            expect(resWeather.headers.allow).to.match(/GET/);
            expect(resWeather.headers.allow).to.match(/HEAD/);

            const resHealth = await request(server).put('/health');
            expect(resHealth.status).to.equal(405);
            expect(resHealth.headers.allow).to.match(/GET/);
        });

        it('should rate-limit abusive clients but keep /health available', async () => {
            const limited = startServer(mockWeatherData, 'Helsinki', mockKit, {
                rateLimitMax: 3,
                rateLimitWindowMs: 60_000,
            });

            try {
                expect((await request(limited).get('/weather')).status).to.equal(200);
                expect((await request(limited).get('/weather')).status).to.equal(200);
                expect((await request(limited).get('/weather')).status).to.equal(200);

                const blocked = await request(limited).get('/weather');
                expect(blocked.status).to.equal(429);
                expect(blocked.headers['retry-after']).to.exist;

                const health = await request(limited).get('/health');
                expect(health.status).to.equal(200);
                expect(health.body.status).to.equal('ok');
            } finally {
                if (limited.listening) {
                    await new Promise((resolve) => limited.close(resolve));
                }
            }
        });
    });

    describe('🛡️ Security Headers (OSSF Hardened)', () => {
        it('should have all strict security headers enabled', async () => {
            const res = await request(server).get('/');
            const headers = res.header;
            expect(headers['x-content-type-options']).to.equal('nosniff');
            expect(headers['x-frame-options']).to.equal('DENY');
            expect(headers['content-security-policy']).to.contain("default-src 'none'");
            expect(headers['strict-transport-security']).to.contain('max-age=31536000');
            expect(headers['cross-origin-opener-policy']).to.equal('same-origin');
            expect(headers['cross-origin-resource-policy']).to.equal('same-origin');
            expect(headers['cross-origin-embedder-policy']).to.equal('require-corp');
            expect(headers['referrer-policy']).to.equal('no-referrer');
            expect(headers['permissions-policy']).to.contain('geolocation=()');
            expect(headers['x-xss-protection']).to.equal('1; mode=block');
        });

        it('should prevent caching on every response class', async () => {
            for (const route of ['/', '/health', '/weather', '/robots.txt', '/unknown-path']) {
                const res = await request(server).get(route);
                expect(res.header['cache-control']).to.contain('no-store');
            }
        });
    });

    describe('🔑 Optional /weather API token', () => {
        it('should reject missing or wrong tokens with 401 when apiToken is set', async () => {
            const locked = startServer(mockWeatherData, 'Helsinki', mockKit, {
                apiToken: 'test-weather-token',
            });

            try {
                const missing = await request(locked).get('/weather');
                expect(missing.status).to.equal(401);
                expect(missing.headers['www-authenticate']).to.match(/Bearer/i);

                const wrong = await request(locked)
                    .get('/weather')
                    .set('Authorization', 'Bearer wrong-token');
                expect(wrong.status).to.equal(401);

                // Health stays open for probes
                const health = await request(locked).get('/health');
                expect(health.status).to.equal(200);
            } finally {
                if (locked.listening) {
                    await new Promise((resolve) => locked.close(resolve));
                }
            }
        });

        it('should accept Bearer and X-API-Key when the token matches', async () => {
            const locked = startServer(mockWeatherData, 'Helsinki', mockKit, {
                apiToken: 'test-weather-token',
            });

            try {
                const bearer = await request(locked)
                    .get('/weather')
                    .set('Authorization', 'Bearer test-weather-token');
                expect(bearer.status).to.equal(200);
                expect(bearer.body.location).to.equal('Helsinki');

                const apiKey = await request(locked)
                    .get('/weather')
                    .set('X-API-Key', 'test-weather-token');
                expect(apiKey.status).to.equal(200);
            } finally {
                if (locked.listening) {
                    await new Promise((resolve) => locked.close(resolve));
                }
            }
        });
    });

    describe('🧭 normalizeRequestPath', () => {
        it('should collapse slashes, strip query, and reject bad paths', () => {
            expect(normalizeRequestPath('/weather')).to.deep.equal({ ok: true, path: '/weather' });
            expect(normalizeRequestPath('/weather/?x=1')).to.deep.equal({ ok: true, path: '/weather' });
            expect(normalizeRequestPath('//health')).to.deep.equal({ ok: true, path: '/health' });
            expect(normalizeRequestPath('/../secret')).to.deep.equal({ ok: false, code: 400 });
            expect(normalizeRequestPath(`/${'x'.repeat(2100)}`)).to.deep.equal({ ok: false, code: 414 });
            expect(normalizeRequestPath('%E0%A4%A')).to.deep.equal({ ok: false, code: 400 });
        });
    });

    describe('🔐 TLS configuration', () => {
        it('should keep local development on HTTP when TLS is not configured', () => {
            expect(loadTlsOptions({})).to.be.undefined;
        });

        it('should fail closed when only one TLS path is configured', () => {
            expect(() => loadTlsOptions({ TLS_CERT_PATH: 'cert.pem' }))
                .to.throw('TLS_CERT_PATH and TLS_KEY_PATH must be set together');
            expect(() => loadTlsOptions({ TLS_KEY_PATH: 'key.pem' }))
                .to.throw('TLS_CERT_PATH and TLS_KEY_PATH must be set together');
        });

        it('should load both TLS files and require TLS 1.2 or newer', () => {
            const reads = [];
            const tlsOptions = loadTlsOptions(
                { TLS_CERT_PATH: ' cert.pem ', TLS_KEY_PATH: ' key.pem ' },
                (filePath) => {
                    reads.push(filePath);
                    return Buffer.from(filePath);
                }
            );

            expect(reads).to.deep.equal(['cert.pem', 'key.pem']);
            expect(tlsOptions.cert.toString()).to.equal('cert.pem');
            expect(tlsOptions.key.toString()).to.equal('key.pem');
            expect(tlsOptions.minVersion).to.equal('TLSv1.2');
        });
    });
});
