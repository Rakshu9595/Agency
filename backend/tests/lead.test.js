process.env.NODE_ENV = 'test';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import express from 'express';
import app from '../src/app.js';
import { Lead } from '../src/models/Lead.js';
import { leadSubmissionLimiter } from '../src/middleware/rate-limit.middleware.js';
import { validateLeadSubmission } from '../src/validators/lead.validator.js';
import { handleCreateLead } from '../src/controllers/lead.controller.js';
import { errorMiddleware } from '../src/middleware/error.middleware.js';

const validPayload = {
  name: 'Global Tech Enterprises',
  email: 'contact@globaltech.example.com',
  phone: '+91 9123456789',
  customerType: 'business',
  service: 'custom-software',
  projectTitle: 'Enterprise CRM Platform',
  description: 'We need an end-to-end custom software platform with real-time analytics and user management.',
  budgetAmount: 500000,
  budgetCurrency: 'INR',
  deadline: '2027-01-15',
  referenceLinks: ['https://example.com/spec', 'https://example.com/figma'],
  preferredContact: 'email',
  privacyConsent: true,
  website: '',
};

describe('Lead Creation and Service Tests', () => {
  let originalSave;

  beforeEach(() => {
    originalSave = Lead.prototype.save;
  });

  afterEach(() => {
    Lead.prototype.save = originalSave;
  });

  it('should successfully create a lead and return 201 with referenceId', async () => {
    // Mock successful MongoDB save
    Lead.prototype.save = async function () {
      return {
        _id: 'mock_mongo_id_123',
        referenceId: this.referenceId,
        status: 'new',
        source: 'website',
        notes: '',
      };
    };

    const res = await request(app).post('/api/v1/leads').send(validPayload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Your project inquiry has been received.');
    assert.ok(res.body.data);
    assert.ok(typeof res.body.data.referenceId === 'string');
    assert.match(res.body.data.referenceId, /^LEAD-\d{8}-[A-F0-9]{6}$/);

    // Ensure private database fields are NOT exposed publicly
    assert.equal(res.body.data._id, undefined);
    assert.equal(res.body.data.status, undefined);
    assert.equal(res.body.data.notes, undefined);
    assert.equal(res.body.data.source, undefined);
    assert.equal(res.body.data.__v, undefined);
  });

  it('should handle database persistence failure safely with 500 and no stack trace leak', async () => {
    // Mock database connection/persistence failure
    Lead.prototype.save = async function () {
      throw new Error('MongoServerSelectionError: connection timed out');
    };

    const res = await request(app).post('/api/v1/leads').send(validPayload);

    assert.equal(res.status, 500);
    assert.equal(res.body.success, false);
    // Ensure no internal stack trace or raw connection details are leaked
    assert.equal(res.body.stack, undefined);
    assert.ok(typeof res.body.message === 'string');
  });

  it('should prevent mass assignment of protected status and notes fields', async () => {
    const maliciousPayload = {
      ...validPayload,
      status: 'won',
      notes: 'Internal secret note attempt',
    };

    const res = await request(app).post('/api/v1/leads').send(maliciousPayload);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Mass assignment prohibited/);
  });

  it('should enforce rate limiting when enabled', async () => {
    // Create an isolated test app instance with rate limiting enabled
    process.env.ENABLE_TEST_RATE_LIMIT = 'true';

    try {
      // Mock save to succeed quickly
      Lead.prototype.save = async function () {
        return { referenceId: this.referenceId };
      };

      const testApp = express();
      testApp.use(express.json());
      testApp.post(
        '/test-leads',
        leadSubmissionLimiter,
        validateLeadSubmission,
        handleCreateLead
      );
      testApp.use(errorMiddleware);

      const maxLimit = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 10;
      let lastResponse;

      // Exhaust the allowed request limit + 1
      for (let i = 0; i <= maxLimit + 1; i++) {
        lastResponse = await request(testApp).post('/test-leads').send(validPayload);
      }

      assert.equal(lastResponse.status, 429);
      assert.equal(lastResponse.body.success, false);
      assert.match(lastResponse.body.message, /Too many inquiries/i);
    } finally {
      delete process.env.ENABLE_TEST_RATE_LIMIT;
    }
  });

  it('should return safe generic error in production mode', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const prodApp = express();
      prodApp.use(express.json());
      prodApp.post('/api/v1/leads-test-error', (req, res, next) => {
        next(new Error('Sensitive cluster auth failure with internal host db.private:27017'));
      });
      prodApp.use(errorMiddleware);

      const res = await request(prodApp).post('/api/v1/leads-test-error').send(validPayload);

      assert.equal(res.status, 500);
      assert.equal(res.body.success, false);
      // In production, generic message must be returned and stack trace hidden
      assert.equal(res.body.message, 'An unexpected error occurred. Please try again later.');
      assert.equal(res.body.stack, undefined);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
