process.env.NODE_ENV = 'test';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Health and System Routes', () => {
  it('GET /api/v1/health should return 200 with running message', async () => {
    const res = await request(app).get('/api/v1/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Agency API is running');
    // Ensure no internal system info leaked
    assert.equal(res.body.env, undefined);
    assert.equal(res.body.database, undefined);
  });

  it('GET /api/v1/health/ready should report readiness without leaking credentials', async () => {
    const res = await request(app).get('/api/v1/health/ready');

    // In isolated test without live DB, readyState is 0 -> returns 503; if connected -> 200
    assert.ok(res.status === 200 || res.status === 503);
    assert.ok(typeof res.body.message === 'string');
    // Ensure no connection string or internals leaked
    assert.equal(res.body.mongoUri, undefined);
    assert.equal(res.body.credentials, undefined);
  });

  it('GET /api/v1/non-existent-route should return 404 Not Found', async () => {
    const res = await request(app).get('/api/v1/non-existent-route');

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /API endpoint not found/);
  });

  it('Phase 2 Admin routes should return 501 Not Implemented', async () => {
    const res = await request(app).get('/api/v1/admin/leads');

    assert.equal(res.status, 501);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Phase 2/i);
  });
});
