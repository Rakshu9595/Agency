process.env.NODE_ENV = 'test';

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { Order } from '../src/models/Order.js';
import { User } from '../src/models/User.js';
import { razorpayService } from '../src/services/razorpay.service.js';
import { isDatabaseConnected, memoryStore } from '../src/utils/memory-store.js';

describe('Razorpay Webhook Processing Tests', () => {
  let userToken;
  let userId;

  before(async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Webhook Tester',
      email: `webhook_${Date.now()}@example.com`,
      password: 'Password123!',
    });
    userToken = regRes.body.data.token;
    userId = regRes.body.data.user.id;
  });

  it('POST /api/v1/payments/webhook should process valid payment.captured event and reconcile order', async () => {
    // 1. Create a pending order
    const orderRes = await request(app)
      .post('/api/v1/payments/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        orderType: 'service_package',
        serviceSlug: 'landing-page',
      });

    const { razorpayOrderId, orderReference } = orderRes.body.data;

    // 2. Prepare webhook payload
    const eventId = `evt_test_${Date.now()}`;
    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_webhook_${Date.now()}`,
            order_id: razorpayOrderId,
            amount: 499900,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };

    const rawBody = JSON.stringify(payload);
    const signature = razorpayService.generateTestWebhookSignature(rawBody);

    const res = await request(app)
      .post('/api/v1/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-event-id', eventId)
      .set('x-razorpay-signature', signature)
      .send(payload);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    // 3. Verify order was marked paid by webhook reconciliation
    const order = isDatabaseConnected() ? await Order.findOne({ orderReference }) : memoryStore.findOrderByReference(orderReference);
    assert.equal(order.paymentStatus, 'paid');
    assert.equal(order.orderStatus, 'completed');

    // 4. Test idempotency with duplicate webhook event ID
    const dupRes = await request(app)
      .post('/api/v1/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-event-id', eventId)
      .set('x-razorpay-signature', signature)
      .send(payload);

    assert.equal(dupRes.status, 200);
    assert.match(dupRes.body.message, /already processed/i);
  });

  it('POST /api/v1/payments/webhook should mark order as failed on payment.failed event', async () => {
    const orderRes = await request(app)
      .post('/api/v1/payments/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        orderType: 'service_package',
        serviceSlug: 'landing-page',
      });

    const { razorpayOrderId, orderReference } = orderRes.body.data;

    const eventId = `evt_fail_${Date.now()}`;
    const payload = {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: `pay_fail_${Date.now()}`,
            order_id: razorpayOrderId,
            amount: 499900,
            status: 'failed',
          },
        },
      },
    };

    const rawBody = JSON.stringify(payload);
    const signature = razorpayService.generateTestWebhookSignature(rawBody);

    const res = await request(app)
      .post('/api/v1/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-event-id', eventId)
      .set('x-razorpay-signature', signature)
      .send(payload);

    assert.equal(res.status, 200);

    const order = isDatabaseConnected() ? await Order.findOne({ orderReference }) : memoryStore.findOrderByReference(orderReference);
    assert.equal(order.paymentStatus, 'failed');
    assert.equal(order.orderStatus, 'failed');
  });
});
