const request = require('supertest');
const { expect } = require('chai');
const app = require('../app');

describe('CORS middleware', () => {
  it('should allow requests from a whitelisted origin', (done) => {
    request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:3001')
      .end((err, res) => {
        expect(res.header['access-control-allow-origin']).to.equal('http://localhost:3001');
        expect(res.statusCode).to.equal(200);
        done();
      });
  });

  it('should block requests from a non-whitelisted origin', (done) => {
    request(app)
      .get('/api/health')
      .set('Origin', 'http://evil.com')
      .end((err, res) => {
        expect(res.header['access-control-allow-origin']).to.be.undefined;
        // This won't have a specific status code from the CORS failure itself,
        // but the request will be blocked. In this setup, it results in a 200
        // because the underlying route handler still succeeds. The key is that
        // the allow-origin header is NOT set.
        done();
      });
  });
});
