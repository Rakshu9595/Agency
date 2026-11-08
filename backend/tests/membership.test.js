process.env.NODE_ENV = 'test';

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { razorpayService } from '../src/services/razorpay.service.js';

describe('Membership & Subscription Lifecycle Tests', () => {
  let userToken;
  let userId;

  before(async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Member Candidate',
      email: `member_${Date.now()}@example.com`,
      password: 'Password123!',
    });
    userToken = regRes.body.data.token;
    userId = regRes.body.data.user.id;
  });

  it('GET /api/v1/memberships/plans should return all active membership plans', async () => {
    const res = await request(app).get('/api/v1/memberships/plans');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.plans));
    assert.ok(res.body.data.plans.length >= 3);
    assert.ok(res.body.data.plans.some((p) => p.planId === 'growth'));
  });

  it('POST /api/v1/memberships/subscribe and payment verification activates membership', async () => {
    // 1. Create membership subscription order for Growth plan
    const subOrderRes = await request(app)
      .post('/api/v1/memberships/subscribe')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        membershipPlanId: 'growth',
      });

    assert.equal(subOrderRes.status, 201);
    const { orderReference, razorpayOrderId } = subOrderRes.body.data;
    assert.equal(subOrderRes.body.data.amount, 4999);

    // 2. Verify payment
    const testPaymentId = `pay_sub_${Date.now()}`;
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

    // 3. Check /memberships/me
    const meRes = await request(app)
      .get('/api/v1/memberships/me')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.data.hasMembership, true);
    assert.equal(meRes.body.data.membership.planId, 'growth');
    assert.equal(meRes.body.data.membership.status, 'active');

    // 4. Check /memberships/me/entitlements
    const entRes = await request(app)
      .get('/api/v1/memberships/me/entitlements')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(entRes.status, 200);
    assert.ok(entRes.body.data.entitlements.includes('service_discount_20'));

    // 5. Test membership discount applied on subsequent service package order
    // Landing page is ₹4,999. With 20% discount: 4999 * 0.8 = ₹3,999
    const discountedOrderRes = await request(app)
      .post('/api/v1/payments/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        orderType: 'service_package',
        serviceSlug: 'landing-page',
      });

    assert.equal(discountedOrderRes.status, 201);
    assert.equal(discountedOrderRes.body.data.amount, 3999); // 20% discount verified!
  });

  it('POST /api/v1/memberships/cancel should schedule cancellation and retain access', async () => {
    const cancelRes = await request(app)
      .post('/api/v1/memberships/cancel')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.data.status, 'cancelled');
    assert.ok(cancelRes.body.data.accessUntil);
  });
});
