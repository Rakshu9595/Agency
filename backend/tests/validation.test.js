process.env.NODE_ENV = 'test';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

const validPayload = {
  name: 'Acme Founder',
  email: 'founder@acme.example.com',
  phone: '+919876543210',
  customerType: 'startup',
  service: 'website-development',
  projectTitle: 'Agency Portfolio Website',
  description: 'We need a high-performance modern agency web platform built with custom features.',
  budgetAmount: 25000,
  budgetCurrency: 'INR',
  deadline: '2026-12-31',
  referenceLinks: ['https://example.com/inspiration'],
  preferredContact: 'email',
  privacyConsent: true,
  website: '',
};

describe('Lead Inquiry Input Validation Tests', () => {
  it('should reject request missing required name', async () => {
    const payload = { ...validPayload };
    delete payload.name;

    const res = await request(app).post('/api/v1/leads').send(payload);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.errors.some((e) => e.field === 'name'));
  });

  it('should reject invalid email format', async () => {
    const payload = { ...validPayload, email: 'not-an-email' };

    const res = await request(app).post('/api/v1/leads').send(payload);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.errors.some((e) => e.field === 'email'));
  });

  it('should reject request missing service', async () => {
    const payload = { ...validPayload };
    delete payload.service;

    const res = await request(app).post('/api/v1/leads').send(payload);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.errors.some((e) => e.field === 'service'));
  });

  it('should reject invalid service enum value', async () => {
    const payload = { ...validPayload, service: 'non-existent-service' };

    const res = await request(app).post('/api/v1/leads').send(payload);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.errors.some((e) => e.field === 'service'));
  });

  it('should reject empty or too-short description', async () => {
    const payload = { ...validPayload, description: 'Too short' };

    const res = await request(app).post('/api/v1/leads').send(payload);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.errors.some((e) => e.field === 'description'));
  });

  it('should reject when privacyConsent is false', async () => {
    const payload = { ...validPayload, privacyConsent: false };

    const res = await request(app).post('/api/v1/leads').send(payload);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.errors.some((e) => e.field === 'privacyConsent'));
  });

  it('should reject invalid reference URL format', async () => {
    const payload = { ...validPayload, referenceLinks: ['ftp://invalid-url', 'not-a-link'] };

    const res = await request(app).post('/api/v1/leads').send(payload);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.errors.some((e) => e.field.startsWith('referenceLinks')));
  });

  it('should reject negative budget amount', async () => {
    const payload = { ...validPayload, budgetAmount: -500 };

    const res = await request(app).post('/api/v1/leads').send(payload);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.errors.some((e) => e.field === 'budgetAmount'));
  });

  it('should reject oversized field values', async () => {
    const payload = {
      ...validPayload,
      name: 'A'.repeat(150), // max is 100
      projectTitle: 'B'.repeat(200), // max is 150
    };

    const res = await request(app).post('/api/v1/leads').send(payload);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('should reject spam submission when honeypot website field is populated', async () => {
    const payload = {
      ...validPayload,
      website: 'http://spam-bot.xyz',
    };

    const res = await request(app).post('/api/v1/leads').send(payload);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /spam/i);
  });

  it('should reject attempted mass assignment of status, referenceId, or notes', async () => {
    const maliciousPayload = {
      ...validPayload,
      status: 'won',
      referenceId: 'LEAD-ATTACK-000',
      notes: 'Secret internal note inject',
    };

    const res = await request(app).post('/api/v1/leads').send(maliciousPayload);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Mass assignment prohibited/i);
  });

  it('should reject malformed JSON request bodies with 400', async () => {
    const res = await request(app)
      .post('/api/v1/leads')
      .set('Content-Type', 'application/json')
      .send('{ "invalid_json": ');

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /JSON/i);
  });
});
