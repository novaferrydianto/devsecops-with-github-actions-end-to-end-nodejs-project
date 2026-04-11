import request from 'supertest';
import { expect } from 'chai';
import { startServer } from '../app.js';

describe('🚀 Integration Test: app.js', () => {
    let server;
    const mockWeatherData = { 
        temp: 20, 
        summary: 'Sunny', 
        precipProbability: 0 
    };

    before(() => {
        // Start server in test mode (no real listen)
        server = startServer(mockWeatherData, 'London');
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

        it('should return 200 OK and weather data for /weather', async () => {
            const res = await request(server).get('/weather');
            expect(res.status).to.equal(200);
            expect(res.body.location).to.equal('London');
            expect(res.body.weather.summary).to.equal('Sunny');
        });

        it('should return 404 for unknown routes', async () => {
            const res = await request(server).get('/unknown-path');
            expect(res.status).to.equal(404);
        });
    });

    describe('🛡️ Security Headers (OSSF Hardened)', () => {
        it('should have strict security headers', async () => {
            const res = await request(server).get('/');
            expect(res.header['x-content-type-options']).to.equal('nosniff');
            expect(res.header['x-frame-options']).to.equal('DENY');
            expect(res.header['content-security-policy']).to.contain("default-src 'none'");
            expect(res.header['strict-transport-security']).to.contain('max-age=31536000');
            expect(res.header['referrer-policy']).to.equal('no-referrer');
        });
    });
});
