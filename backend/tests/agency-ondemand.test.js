process.env.NODE_ENV = 'test';

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { razorpayService } from '../src/services/razorpay.service.js';

describe('On-Demand Website Agency End-to-End Workflow Tests', () => {
  let clientToken;
  let clientId;
  let clientEmail;
  let adminToken;
  let adminId;
  let inquiryRef;
  let quoteRef;
  let projectRef;

  before(async () => {
    // 1. Register a standard client user
    clientEmail = `ondemand_client_${Date.now()}@example.com`;
    const clientRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Rohan Sharma',
      email: clientEmail,
      password: 'ClientPassword123!',
      company: 'Rohan Tech Innovations',
    });
    clientToken = clientRes.body.data.token;
    clientId = clientRes.body.data.user.id;
    assert.equal(clientRes.body.data.user.role, 'client');

    // 2. Register an agency admin with secure invite code
    const adminRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Agency Lead Admin',
      email: `admin_${Date.now()}@agenet.internal`,
      password: 'AdminSuperPassword123!',
      adminInviteCode: 'AGENET_ADMIN_SECRET_2026',
    });
    adminToken = adminRes.body.data.token;
    adminId = adminRes.body.data.user.id;
    assert.equal(adminRes.body.data.user.role, 'admin');
  });

  it('Step 1: Client submits comprehensive on-demand website project inquiry', async () => {
    const res = await request(app)
      .post('/api/v1/project-inquiries')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        websiteType: 'E-commerce Website',
        service: 'e-commerce-development',
        projectTitle: 'D2C Sustainable Fashion Store',
        description: 'Need a custom headless storefront with sub-second catalogue loading, Razorpay checkout, and inventory sync.',
        targetAudience: 'Urban eco-conscious apparel shoppers aged 20-35',
        requiredPages: 'Home, Shop Grid, Product Detail, Cart, Checkout, About, FAQ, Order Tracking',
        requiredFeatures: 'Fast search, filter by size, cart drawer, Razorpay UPI/Cards, automated invoice PDF',
        budgetRange: '₹25,000 - ₹45,000',
        timeline: '3-4 weeks',
        company: 'EcoThreads India',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.referenceId);
    assert.equal(res.body.data.status, 'submitted');
    inquiryRef = res.body.data.referenceId;
  });

  it('Step 2: Admin security enforcement rejects unauthorized access to admin endpoints', async () => {
    // Client cannot access admin summary
    const clientAccess = await request(app)
      .get('/api/v1/admin/summary')
      .set('Authorization', `Bearer ${clientToken}`);
    assert.equal(clientAccess.status, 403);

    // Unauthenticated user cannot access admin summary
    const anonAccess = await request(app).get('/api/v1/admin/summary');
    assert.equal(anonAccess.status, 401);
  });

  it('Step 3: Agency staff reviews inquiries and updates status to under_review', async () => {
    const adminSummary = await request(app)
      .get('/api/v1/admin/summary')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(adminSummary.status, 200);
    assert.ok(adminSummary.body.data.metrics.totalInquiries >= 1);

    const updateStatus = await request(app)
      .patch(`/api/v1/admin/inquiries/${inquiryRef}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'under_review' });
    assert.equal(updateStatus.status, 200);
    assert.equal(updateStatus.body.data.inquiry.status, 'under_review');
  });

  it('Step 4: Agency issues detailed quotation proposal with milestones to client', async () => {
    const totalAmount = 30000;
    const advanceAmount = 15000;

    const res = await request(app)
      .post('/api/v1/admin/quotes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: clientId,
        projectTitle: 'D2C Sustainable Fashion Store',
        service: 'e-commerce-development',
        scopeOfWork: 'Complete UI/UX design, mobile-first responsive coding, Razorpay integration, admin catalogue management.',
        totalAmount,
        advancePercentage: 50,
        milestones: [
          {
            milestoneId: 'ms_1',
            title: 'Advance Kickoff Deposit (50%)',
            amount: advanceAmount,
            percentage: 50,
            status: 'pending',
          },
          {
            milestoneId: 'ms_2',
            title: 'Staging Approval & Catalogue Review (25%)',
            amount: 7500,
            percentage: 25,
            status: 'pending',
          },
          {
            milestoneId: 'ms_3',
            title: 'Final Handover, Deployment & Testing (25%)',
            amount: 7500,
            percentage: 25,
            status: 'pending',
          },
        ],
        includedRevisions: '3 rounds of design reviews',
        supportPeriod: '60 days post-launch technical warranty',
      });

    assert.equal(res.status, 201);
    assert.ok(res.body.data.quote.quoteReference);
    quoteRef = res.body.data.quote.quoteReference;
  });

  it('Step 5: Client reviews proposal, requests revisions, then accepts quotation', async () => {
    // 1. Client fetches their quotes
    const quotesRes = await request(app)
      .get('/api/v1/quotes/mine')
      .set('Authorization', `Bearer ${clientToken}`);
    assert.equal(quotesRes.status, 200);
    assert.ok(quotesRes.body.data.quotes.length >= 1);

    // 2. Client requests revision
    const revRes = await request(app)
      .post(`/api/v1/quotes/${quoteRef}/request-changes`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ feedback: 'Please ensure Razorpay UPI QR code is included in mobile view.' });
    assert.equal(revRes.status, 200);
    assert.equal(revRes.body.data.quote.status, 'changes_requested');

    // 3. Client accepts quotation
    const acceptRes = await request(app)
      .post(`/api/v1/quotes/${quoteRef}/accept`)
      .set('Authorization', `Bearer ${clientToken}`);
    assert.equal(acceptRes.status, 200);
    assert.equal(acceptRes.body.data.quote.status, 'approved');
    assert.ok(acceptRes.body.data.project.projectReference);
    projectRef = acceptRes.body.data.project.projectReference;
    assert.equal(acceptRes.body.data.project.stage, 'awaiting_advance');
  });

  it('Step 6: Client pays advance deposit via verified Razorpay checkout -> Project moves to design stage', async () => {
    // 1. Create advance payment order
    const orderRes = await request(app)
      .post('/api/v1/payments/orders')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        orderType: 'project_advance',
        quoteReference: quoteRef,
      });

    assert.equal(orderRes.status, 201);
    const { orderReference, razorpayOrderId, amount } = orderRes.body.data;
    assert.equal(amount, 15000);

    // 2. Client completes Razorpay checkout and sends valid HMAC signature for verification
    const testPaymentId = `pay_adv_${Date.now().toString(36)}`;
    const validSignature = razorpayService.generateTestSignature(razorpayOrderId, testPaymentId);

    const verifyRes = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: validSignature,
      });

    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.data.paymentStatus, 'paid');

    // 3. Verify client project stage transitioned to 'design'
    const projRes = await request(app)
      .get('/api/v1/projects/mine')
      .set('Authorization', `Bearer ${clientToken}`);
    assert.equal(projRes.status, 200);
    const myProject = projRes.body.data.projects.find((p) => p.projectReference === projectRef);
    assert.ok(myProject);
    assert.equal(myProject.stage, 'design');
    assert.equal(myProject.paidAmount, 15000);
  });

  it('Step 7: Agency updates project stage to development, posts progress update, and client views timeline', async () => {
    // 1. Admin advances stage to development and provides staging URL
    const stageRes = await request(app)
      .patch(`/api/v1/admin/projects/${projectRef}/stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        stage: 'development',
        stagingUrl: 'https://staging.ecothreads.agency.dev',
        note: 'Sprint 1 complete. Core architecture and catalogue ready for preview.',
      });
    assert.equal(stageRes.status, 200);
    assert.equal(stageRes.body.data.project.stage, 'development');

    // 2. Client checks project updates timeline
    const updatesRes = await request(app)
      .get(`/api/v1/projects/${projectRef}/updates`)
      .set('Authorization', `Bearer ${clientToken}`);
    assert.equal(updatesRes.status, 200);
    assert.ok(updatesRes.body.data.updates.length >= 1);
  });

  it('Step 8: Milestone unlocking, payment, and final delivery workflow', async () => {
    // 1. Admin adds an upcoming milestone
    const addMilestoneRes = await request(app)
      .post(`/api/v1/admin/projects/${projectRef}/milestones`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Milestone 2 - Catalogue Staging Review',
        amount: 7500,
        completionCriteria: 'All 50 products ingested, cart drawer working, search optimized.',
      });
    assert.equal(addMilestoneRes.status, 201);
    const milestoneRef = addMilestoneRes.body.data.milestone.milestoneReference;

    // 2. Admin sets milestone payable
    const unlockRes = await request(app)
      .patch(`/api/v1/admin/milestones/${milestoneRef}/payable`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(unlockRes.status, 200);
    assert.equal(unlockRes.body.data.milestone.paymentState, 'payable');

    // 3. Client views milestones
    const clientMilestones = await request(app)
      .get(`/api/v1/projects/${projectRef}/milestones`)
      .set('Authorization', `Bearer ${clientToken}`);
    assert.equal(clientMilestones.status, 200);
    const ms = clientMilestones.body.data.milestones.find((m) => m.milestoneReference === milestoneRef);
    assert.ok(ms);
    assert.equal(ms.paymentState, 'payable');

    // 4. Admin marks project delivered with live URL
    const deliverRes = await request(app)
      .patch(`/api/v1/admin/projects/${projectRef}/stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        stage: 'delivered',
        status: 'completed',
        liveUrl: 'https://ecothreads.in',
        repositoryUrl: 'https://github.com/agency-client/ecothreads',
        note: 'Project successfully launched on custom domain with SSL enabled!',
      });
    assert.equal(deliverRes.status, 200);
    assert.equal(deliverRes.body.data.project.stage, 'delivered');
    assert.equal(deliverRes.body.data.project.status, 'completed');
  });
});
