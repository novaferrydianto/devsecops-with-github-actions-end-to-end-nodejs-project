import request from 'supertest';
import { expect } from 'chai';
import { loadTlsOptions, startServer } from '../app.js';

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
    });

    describe('🛡️ Security Headers (OSSF Hardened)', () => {
        it('should have all strict security headers enabled', async () => {
            const res = await request(server).get('/');
            const headers = res.header;
            expect(headers['x-content-type-options']).to.equal('nosniff');
            expect(headers['x-frame-options']).to.equal('DENY');
            expect(headers['content-security-policy']).to.contain("default-src 'none'");
            expect(headers['strict-transport-security']).to.contain('max-age=31536000');
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

    describe('🔐 TLS configuration', () => {
        it('should keep local development on HTTP when TLS is not configured', () => {
            expect(loadTlsOptions({})).to.equal(undefined);
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
