process.env.NODE_ENV = 'test';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { generateToken } from '../src/utils/security.js';

describe('Authentication & User Management Integration Tests', () => {
  it('POST /api/v1/auth/register should create a new user account with hashed password and token', async () => {
    const testEmail = `newuser_${Date.now()}@example.com`;
    const payload = {
      name: 'John Developer',
      email: testEmail,
      password: 'SecurePassword123!',
      phone: '+91 9876543210',
      company: 'Tech Startup Inc',
    };

    const res = await request(app).post('/api/v1/auth/register').send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.email, testEmail);
    assert.equal(res.body.data.user.name, 'John Developer');
    assert.equal(res.body.data.user.password, undefined); // Ensure password hash never returned
  });

  it('POST /api/v1/auth/register should reject registration with existing email', async () => {
    const duplicateEmail = `dup_${Date.now()}@example.com`;
    const payload = {
      name: 'First User',
      email: duplicateEmail,
      password: 'Password123!',
    };

    // First registration
    await request(app).post('/api/v1/auth/register').send(payload);

    // Duplicate registration attempt
    const res = await request(app).post('/api/v1/auth/register').send(payload);

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /already exists/i);
  });

  it('POST /api/v1/auth/register should reject short password (< 8 chars)', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Short Pwd User',
      email: `short_${Date.now()}@example.com`,
      password: 'short',
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /at least 8 characters/i);
  });

  it('POST /api/v1/auth/login should authenticate valid user and return JWT token', async () => {
    const loginEmail = `login_${Date.now()}@example.com`;
    const password = 'CorrectPassword99!';

    await request(app).post('/api/v1/auth/register').send({
      name: 'Login User',
      email: loginEmail,
      password,
    });

    const res = await request(app).post('/api/v1/auth/login').send({
      email: loginEmail,
      password,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.email, loginEmail);
  });

  it('POST /api/v1/auth/login should reject invalid password', async () => {
    const userEmail = `wrongpwd_${Date.now()}@example.com`;
    await request(app).post('/api/v1/auth/register').send({
      name: 'Wrong Pwd User',
      email: userEmail,
      password: 'GoodPassword123!',
    });

    const res = await request(app).post('/api/v1/auth/login').send({
      email: userEmail,
      password: 'IncorrectPassword!',
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Invalid email or password/i);
  });

  it('GET /api/v1/auth/me should return current profile when authenticated', async () => {
    const meEmail = `me_${Date.now()}@example.com`;
    const regRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Me Profile User',
      email: meEmail,
      password: 'Password1234!',
    });

    const token = regRes.body.data.token;

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.email, meEmail);
  });

  it('GET /api/v1/auth/me should reject request without token or with forged token', async () => {
    const noTokenRes = await request(app).get('/api/v1/auth/me');
    assert.equal(noTokenRes.status, 401);

    const forgedRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer forged.token.signature');
    assert.equal(forgedRes.status, 401);
  });

  it('POST /api/v1/auth/forgot-password and reset-password workflow', async () => {
    const resetEmail = `reset_${Date.now()}@example.com`;
    await request(app).post('/api/v1/auth/register').send({
      name: 'Reset Candidate',
      email: resetEmail,
      password: 'InitialPassword123!',
    });

    // Request reset
    const forgotRes = await request(app).post('/api/v1/auth/forgot-password').send({
      email: resetEmail,
    });
    assert.equal(forgotRes.status, 200);
    const tokenPreview = forgotRes.body.data.resetTokenPreview;
    assert.ok(tokenPreview);

    // Perform reset
    const newPassword = 'BrandNewPassword999!';
    const resetRes = await request(app).post('/api/v1/auth/reset-password').send({
      token: tokenPreview,
      newPassword,
    });
    assert.equal(resetRes.status, 200);

    // Verify login with new password
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: resetEmail,
      password: newPassword,
    });
    assert.equal(loginRes.status, 200);
  });
});
