process.env.NODE_ENV = 'test';

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { Quote } from '../src/models/Quote.js';
import { User } from '../src/models/User.js';
import { razorpayService } from '../src/services/razorpay.service.js';
import { isDatabaseConnected, memoryStore } from '../src/utils/memory-store.js';

describe('Payment & Razorpay Integration Tests', () => {
  let userToken;
  let userId;
  let otherUserToken;
  let otherUserId;

  before(async () => {
    // Register primary test user
    const u1 = await request(app).post('/api/v1/auth/register').send({
      name: 'Payer One',
      email: `payer1_${Date.now()}@example.com`,
      password: 'StrongPassword123!',
    });
    userToken = u1.body.data.token;
    userId = u1.body.data.user.id;

    // Register secondary test user for ownership testing
    const u2 = await request(app).post('/api/v1/auth/register').send({
      name: 'Payer Two',
      email: `payer2_${Date.now()}@example.com`,
      password: 'StrongPassword123!',
    });
    otherUserToken = u2.body.data.token;
    otherUserId = u2.body.data.user.id;
  });

  it('POST /api/v1/payments/orders should create a valid order for fixed-price service package', async () => {
    const res = await request(app)
      .post('/api/v1/payments/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        orderType: 'service_package',
        serviceSlug: 'landing-page',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.orderReference);
    assert.ok(res.body.data.razorpayOrderId);
    assert.equal(res.body.data.amount, 4999);
    assert.equal(res.body.data.amountInPaise, 499900);
    assert.equal(res.body.data.currency, 'INR');
  });

  it('POST /api/v1/payments/orders should reject client-supplied amount tampering', async () => {
    const res = await request(app)
      .post('/api/v1/payments/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        orderType: 'service_package',
        serviceSlug: 'landing-page',
        clientSuppliedAmount: 10, // Attempted tamper from 4999 to 10
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /tampering|mismatch/i);
  });

  it('POST /api/v1/payments/orders should reject non-existent service package', async () => {
    const res = await request(app)
      .post('/api/v1/payments/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        orderType: 'service_package',
        serviceSlug: 'phantom-non-existent-service',
      });

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  it('POST /api/v1/payments/orders should reject unapproved project quote payment', async () => {
    const quoteData = {
      quoteReference: `QUOTE-TEST-${Date.now().toString().slice(-6)}`,
      customerId: userId,
      projectTitle: 'Unapproved Custom Platform',
      service: 'custom-software',
      totalAmount: 50000,
      advanceAmount: 25000,
      status: 'sent', // Not yet approved!
    };
    memoryStore.saveQuote(quoteData);
    if (isDatabaseConnected()) {
      const quote = new Quote(quoteData);
      await quote.save();
    }

    const res = await request(app)
      .post('/api/v1/payments/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        orderType: 'project_advance',
        quoteReference: quoteData.quoteReference,
      });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /approved/i);
  });

  it('POST /api/v1/payments/orders should create order for approved quote advance', async () => {
    const quoteData = {
      quoteReference: `QUOTE-APPV-${Date.now().toString().slice(-6)}`,
      customerId: userId,
      projectTitle: 'Approved Custom Platform',
      service: 'custom-software',
      totalAmount: 60000,
      advanceAmount: 30000,
      status: 'approved',
      milestones: [
        { milestoneId: 'ms_1', title: 'Advance', amount: 30000, percentage: 50, status: 'pending' },
        { milestoneId: 'ms_2', title: 'Delivery', amount: 30000, percentage: 50, status: 'pending' },
      ],
    };
    memoryStore.saveQuote(quoteData);
    if (isDatabaseConnected()) {
      const quote = new Quote(quoteData);
      await quote.save();
    }

    const res = await request(app)
      .post('/api/v1/payments/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        orderType: 'project_advance',
        quoteReference: quoteData.quoteReference,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.amount, 30000);
  });

  it('POST /api/v1/payments/verify should reject forged payment signature', async () => {
    // Create an order
    const orderRes = await request(app)
      .post('/api/v1/payments/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        orderType: 'service_package',
        serviceSlug: 'landing-page',
      });

    const { razorpayOrderId } = orderRes.body.data;

    const verifyRes = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: 'pay_test_attack123',
        razorpay_signature: 'fake_forged_hex_signature_abcdef123456',
      });

    assert.equal(verifyRes.status, 400);
    assert.equal(verifyRes.body.success, false);
    assert.match(verifyRes.body.message, /signature/i);
  });

  it('POST /api/v1/payments/verify should successfully verify payment with valid HMAC signature', async () => {
    const orderRes = await request(app)
      .post('/api/v1/payments/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        orderType: 'service_package',
        serviceSlug: 'landing-page',
      });

    const { orderReference, razorpayOrderId } = orderRes.body.data;
    const testPaymentId = `pay_valid_${Date.now().toString(36)}`;
    const validSignature = razorpayService.generateTestSignature(razorpayOrderId, testPaymentId);

    const verifyRes = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: validSignature,
      });

    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.success, true);
    assert.equal(verifyRes.body.data.paymentStatus, 'paid');
    assert.ok(verifyRes.body.data.receiptNumber);

    // Verify duplicate verification returns idempotency success
    const dupRes = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: validSignature,
      });
    assert.equal(dupRes.status, 200);

    // Verify receipt endpoint
    const receiptRes = await request(app)
      .get(`/api/v1/payments/${orderReference}/receipt`)
      .set('Authorization', `Bearer ${userToken}`);
    assert.equal(receiptRes.status, 200);
    assert.equal(receiptRes.body.data.receipt.orderReference, orderReference);

    // Verify cross-user ownership isolation (other user cannot view receipt)
    const unauthorizedRes = await request(app)
      .get(`/api/v1/payments/${orderReference}/receipt`)
      .set('Authorization', `Bearer ${otherUserToken}`);
    assert.equal(unauthorizedRes.status, 403);
  });

  it('POST /api/v1/payments/:orderReference/refund-requests should create refund request on paid order', async () => {
    // Create & pay order
    const orderRes = await request(app)
      .post('/api/v1/payments/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        orderType: 'service_package',
        serviceSlug: 'landing-page',
      });

    const { orderReference, razorpayOrderId } = orderRes.body.data;
    const testPaymentId = `pay_refund_${Date.now().toString(36)}`;
    const validSignature = razorpayService.generateTestSignature(razorpayOrderId, testPaymentId);

    await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: validSignature,
      });

    // Request refund
    const refundRes = await request(app)
      .post(`/api/v1/payments/${orderReference}/refund-requests`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        reason: 'Duplicate payment accidental click during checkout',
      });

    assert.equal(refundRes.status, 201);
    assert.equal(refundRes.body.success, true);
    assert.ok(refundRes.body.data.refundReference);
    assert.equal(refundRes.body.data.status, 'requested');
  });
});
