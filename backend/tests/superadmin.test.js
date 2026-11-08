process.env.NODE_ENV = 'test';

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { hashPassword } from '../src/utils/security.js';
import { memoryStore } from '../src/utils/memory-store.js';

describe('PRAVYUK Super Admin Dashboard & System Integration Tests', () => {
  let superAdminToken;
  let adminToken;
  let clientToken;
  let superAdminId;
  let adminId;
  let clientId;

  const superAdminEmail = 'superadmin@pravyuk.com';
  const superAdminPassword = 'SuperAdminPassword#2026';

  const regularAdminEmail = 'admin.operations@pravyuk.com';
  const regularAdminPassword = 'StaffAdminPassword#2026';

  const clientEmail = 'client.customer@example.com';
  const clientPassword = 'ClientPassword#2026';

  before(async () => {
    // 1. Seed Super Admin
    const hashedSuperPw = await hashPassword(superAdminPassword);
    const superAdmin = memoryStore.saveUser({
      name: 'Pravyuk Super Admin',
      email: superAdminEmail,
      password: hashedSuperPw,
      role: 'super_admin',
      permissions: ['*'],
      status: 'active',
    });
    superAdminId = superAdmin.id;

    // 2. Seed Scoped Admin
    const hashedAdminPw = await hashPassword(regularAdminPassword);
    const admin = memoryStore.saveUser({
      name: 'Pravyuk Ops Admin',
      email: regularAdminEmail,
      password: hashedAdminPw,
      role: 'admin',
      permissions: ['dashboard.read', 'services.manage', 'content.manage', 'inquiries.manage'],
      status: 'active',
    });
    adminId = admin.id;

    // 3. Seed Client User
    const hashedClientPw = await hashPassword(clientPassword);
    const client = memoryStore.saveUser({
      name: 'Client Customer',
      email: clientEmail,
      password: hashedClientPw,
      role: 'client',
      status: 'active',
    });
    clientId = client.id;

    // Login Super Admin
    const superRes = await request(app).post('/api/v1/auth/login').send({
      email: superAdminEmail,
      password: superAdminPassword,
    });
    superAdminToken = superRes.body.data.token;

    // Login Scoped Admin
    const adminRes = await request(app).post('/api/v1/auth/login').send({
      email: regularAdminEmail,
      password: regularAdminPassword,
    });
    adminToken = adminRes.body.data.token;

    // Login Client
    const clientRes = await request(app).post('/api/v1/auth/login').send({
      email: clientEmail,
      password: clientPassword,
    });
    clientToken = clientRes.body.data.token;
  });

  // ==========================================
  // 1. Authentication & Security Lockout
  // ==========================================
  describe('1. Super Admin Authentication & Security Policies', () => {
    it('should successfully authenticate super admin and return role super_admin with wildcard permissions', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: superAdminEmail,
        password: superAdminPassword,
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.user.role, 'super_admin');
      assert.ok(res.body.data.user.permissions.includes('*'));
      assert.ok(res.body.data.token);
    });

    it('should prevent public registration with role=super_admin', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Hacker User',
        email: 'hacker@test.com',
        password: 'Password123!',
        role: 'super_admin',
      });

      assert.equal(res.status, 201);
      // Public registration must default to client, ignoring privilege escalation attempts
      assert.equal(res.body.data.user.role, 'client');
    });

    it('should lock out account after 5 consecutive failed login attempts', async () => {
      const victimEmail = `victim_${Date.now()}@example.com`;
      const victimPw = 'ValidPassword#123';
      memoryStore.saveUser({
        name: 'Victim User',
        email: victimEmail,
        password: await hashPassword(victimPw),
        role: 'client',
      });

      // 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/v1/auth/login').send({
          email: victimEmail,
          password: 'WrongPassword',
        });
      }

      // 6th attempt with correct password should be rejected due to lockout
      const lockedRes = await request(app).post('/api/v1/auth/login').send({
        email: victimEmail,
        password: victimPw,
      });

      assert.ok([423, 429].includes(lockedRes.status));
      assert.match(lockedRes.body.message, /temporarily locked/i);
    });

    it('should reject unauthenticated or client requests to admin endpoints', async () => {
      const noAuthRes = await request(app).get('/api/v1/admin/summary');
      assert.equal(noAuthRes.status, 401);

      const clientRes = await request(app)
        .get('/api/v1/admin/summary')
        .set('Authorization', `Bearer ${clientToken}`);
      assert.equal(clientRes.status, 403);
    });

    it('should enforce super_admin only endpoints when accessed by scoped admin', async () => {
      // Regular admin trying to invite an admin user
      const inviteRes = await request(app)
        .post('/api/v1/admin/users/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Unauthorized Invite',
          email: 'unauth@test.com',
          password: 'Password123!',
          role: 'admin',
        });
      assert.equal(inviteRes.status, 403);

      // Regular admin trying to update website global settings
      const settingsRes = await request(app)
        .put('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          general: { siteName: 'Tampered Name' },
        });
      assert.equal(settingsRes.status, 403);
    });
  });

  // ==========================================
  // 2. Website Content Management (CMS)
  // ==========================================
  describe('2. Website Content Management (CMS)', () => {
    it('should fetch and update homepage CMS content and reflect on public endpoint', async () => {
      // 1. Admin gets current homepage content
      const getRes = await request(app)
        .get('/api/v1/admin/content/homepage')
        .set('Authorization', `Bearer ${superAdminToken}`);
      assert.equal(getRes.status, 200);
      assert.equal(getRes.body.data.content.heroHeading, 'Your Vision. Our Build.');

      // 2. Admin updates homepage content
      const updateRes = await request(app)
        .put('/api/v1/admin/content/homepage')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          data: {
            ...getRes.body.data.content,
            eyebrow: 'Bespoke Engineering & Design',
            heroHeading: 'Architecting Digital Excellence.',
            heroDescription: 'From responsive startup storefronts to scalable enterprise web platforms.',
          },
        });
      assert.equal(updateRes.status, 200);
      assert.equal(updateRes.body.data.content.heroHeading, 'Architecting Digital Excellence.');

      // 3. Public visitor accesses homepage content
      const publicRes = await request(app).get('/api/v1/content/homepage');
      assert.equal(publicRes.status, 200);
      assert.equal(publicRes.body.data.content.heroHeading, 'Architecting Digital Excellence.');
    });

    it('should fetch and update navigation items and footer content', async () => {
      const footerRes = await request(app)
        .put('/api/v1/admin/content/footer')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          data: {
            tagline: 'Your Vision. Our Build.',
            address: 'Bengaluru Tech Park, India',
            email: 'contact@pravyuk.com',
          },
        });
      assert.equal(footerRes.status, 200);

      const publicFooter = await request(app).get('/api/v1/content/footer');
      assert.equal(publicFooter.status, 200);
      assert.equal(publicFooter.body.data.footer.email, 'contact@pravyuk.com');
    });
  });

  // ==========================================
  // 3. Services Management CRUD
  // ==========================================
  describe('3. Services & Packages Management', () => {
    let createdServiceId;

    it('should create a new service package', async () => {
      const res = await request(app)
        .post('/api/v1/admin/services')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'AI Agent & LLM Automation',
          shortDescription: 'Custom multi-agent workflows and autonomous business integrations.',
          startingPrice: 35000,
          estimatedDelivery: '7-14 business days',
          category: 'AI & Automation',
          features: ['Custom Prompt Architecture', 'Vector Knowledge Retrieval', 'Razorpay Automated Invoicing'],
          deliverables: ['Full Python & Node.js backend', 'API Gateway Documentation'],
          status: 'active',
          isFeatured: true,
        });

      assert.equal(res.status, 201);
      assert.ok(res.body.data.service.slug);
      createdServiceId = res.body.data.service._id || res.body.data.service.id;
    });

    it('should list services and update created service', async () => {
      const listRes = await request(app)
        .get('/api/v1/admin/services')
        .set('Authorization', `Bearer ${superAdminToken}`);
      assert.equal(listRes.status, 200);
      assert.ok(listRes.body.data.services.length >= 1);

      const updateRes = await request(app)
        .put(`/api/v1/admin/services/${createdServiceId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          startingPrice: 42000,
          shortDescription: 'Updated high-performance AI automation workflows.',
        });
      assert.equal(updateRes.status, 200);
      assert.equal(updateRes.body.data.service.startingPrice, 42000);
    });

    it('should delete a service package', async () => {
      const delRes = await request(app)
        .delete(`/api/v1/admin/services/${createdServiceId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      assert.equal(delRes.status, 200);
    });
  });

  // ==========================================
  // 4. Portfolio Showcase Management CRUD
  // ==========================================
  describe('4. Portfolio Showcase Management', () => {
    let portfolioItemId;

    it('should create a portfolio item', async () => {
      const res = await request(app)
        .post('/api/v1/admin/portfolio')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          title: 'Quantum Pay D2C Store',
          category: 'E-Commerce',
          clientName: 'Quantum Brands',
          description: 'High-converting apparel storefront with integrated UPI checkout.',
          techStack: ['Node.js', 'Express', 'Razorpay', 'TailwindCSS'],
          liveUrl: 'https://example.com/quantumpay',
          isFeatured: true,
          status: 'published',
        });

      assert.equal(res.status, 201);
      portfolioItemId = res.body.data.item._id || res.body.data.item.id;
    });

    it('should list and update portfolio item', async () => {
      const listRes = await request(app)
        .get('/api/v1/admin/portfolio')
        .set('Authorization', `Bearer ${superAdminToken}`);
      assert.equal(listRes.status, 200);
      assert.ok(listRes.body.data.portfolio.length >= 1);

      const updateRes = await request(app)
        .put(`/api/v1/admin/portfolio/${portfolioItemId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          tagline: 'Delivered in 5 days with 100% custom code',
        });
      assert.equal(updateRes.status, 200);
      assert.equal(updateRes.body.data.item.tagline, 'Delivered in 5 days with 100% custom code');
    });

    it('should delete portfolio item', async () => {
      const delRes = await request(app)
        .delete(`/api/v1/admin/portfolio/${portfolioItemId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      assert.equal(delRes.status, 200);
    });
  });

  // ==========================================
  // 5. Blog & FAQs Management
  // ==========================================
  describe('5. Blog & FAQs Management', () => {
    let blogPostId;
    let faqId;

    it('should create and update a blog post', async () => {
      const res = await request(app)
        .post('/api/v1/admin/blog')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          title: 'Why Milestone-Based Web Development Protects Your Capital',
          excerpt: 'Discover why Pravyuk uses milestone-gated development instead of high upfront risk.',
          content: 'Full article text explaining milestone releases and verify-then-pay architecture.',
          category: 'Business',
          tags: ['Strategy', 'Finances', 'Development'],
          status: 'published',
        });

      assert.equal(res.status, 201);
      blogPostId = res.body.data.post._id || res.body.data.post.id;

      const updateRes = await request(app)
        .put(`/api/v1/admin/blog/${blogPostId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ title: 'Why Milestone-Based Web Development Protects Startup Capital' });
      assert.equal(updateRes.status, 200);

      // Clean up
      await request(app)
        .delete(`/api/v1/admin/blog/${blogPostId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
    });

    it('should create and update an FAQ item', async () => {
      const res = await request(app)
        .post('/api/v1/admin/faqs')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          question: 'What is Pravyuk’s turnaround time for landing pages?',
          answer: 'Standard landing pages are designed, coded, and deployed in 3 to 7 business days.',
          category: 'Timeline',
        });

      assert.equal(res.status, 201);
      faqId = res.body.data.faq._id || res.body.data.faq.id;

      const updateRes = await request(app)
        .put(`/api/v1/admin/faqs/${faqId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ answer: 'Bespoke landing pages are deployed within 3 to 5 business days.' });
      assert.equal(updateRes.status, 200);

      // Clean up
      await request(app)
        .delete(`/api/v1/admin/faqs/${faqId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
    });
  });

  // ==========================================
  // 6. Customer Management
  // ==========================================
  describe('6. Customer Management', () => {
    it('should list all customer accounts with metrics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/customers')
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data.customers));
      assert.ok(res.body.data.customers.some((c) => c.email === clientEmail));
    });

    it('should fetch customer profile with inquiry and project history', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/customers/${clientId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.customer.email, clientEmail);
      assert.ok(Array.isArray(res.body.data.inquiries));
      assert.ok(Array.isArray(res.body.data.projects));
    });

    it('should suspend and reactivate a customer account', async () => {
      // 1. Suspend
      const suspendRes = await request(app)
        .patch(`/api/v1/admin/customers/${clientId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'suspended', reason: 'Terms review' });

      assert.equal(suspendRes.status, 200);
      assert.equal(suspendRes.body.data.customer.status, 'suspended');

      // 2. Suspended customer cannot access authenticated endpoints
      const checkRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${clientToken}`);
      assert.equal(checkRes.status, 403);

      // 3. Reactivate
      const reactivateRes = await request(app)
        .patch(`/api/v1/admin/customers/${clientId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'active' });

      assert.equal(reactivateRes.status, 200);
      assert.equal(reactivateRes.body.data.customer.status, 'active');
    });
  });

  // ==========================================
  // 7. Project Inquiries & Staff Assignment
  // ==========================================
  describe('7. Project Inquiries Management', () => {
    let testInquiryId;

    before(() => {
      const inq = memoryStore.saveInquiry({
        referenceId: 'INQ-TEST-001',
        name: 'Inquiry Client',
        email: 'inquiry.client@test.com',
        service: 'Custom Web Application',
        description: 'Need enterprise CRM with analytics portal and Razorpay billing.',
        status: 'submitted',
      });
      testInquiryId = inq.id;
    });

    it('should fetch inquiry details', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/inquiries/${testInquiryId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.inquiry.referenceId, 'INQ-TEST-001');
    });

    it('should assign inquiry to staff member', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/inquiries/${testInquiryId}/assign`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          assignedStaffId: adminId,
          assignedStaffName: 'Pravyuk Ops Admin',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.inquiry.assignedStaffName, 'Pravyuk Ops Admin');
      assert.equal(res.body.data.inquiry.status, 'under_review');
    });

    it('should add internal team note to inquiry', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/inquiries/${testInquiryId}/notes`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          note: 'Customer requests timeline completion before end of Q4.',
        });

      assert.equal(res.status, 200);
      assert.ok(res.body.data.inquiry.internalNotes.length >= 1);
    });
  });

  // ==========================================
  // 8. Projects & Direct Admin Provisioning
  // ==========================================
  describe('8. Projects & Milestones Admin Tracking', () => {
    let createdProjectId;
    let initialMilestoneId;

    it('should allow admin to provision a project directly with initial milestone', async () => {
      const res = await request(app)
        .post('/api/v1/admin/projects')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          title: 'Direct Client SaaS Portal',
          customerEmail: 'newclient.direct@test.com',
          customerName: 'Direct Client',
          totalBudget: 85000,
          deliverables: ['UI/UX Mockups', 'Backend REST API', 'Staging Deploy'],
          initialMilestone: {
            title: 'Design Approval & Database Schema',
            amount: 25000,
          },
        });

      assert.equal(res.status, 201);
      assert.ok(res.body.data.project.projectReference);
      createdProjectId = res.body.data.project.id || res.body.data.project._id;
    });

    it('should add a milestone and unlock it for payment', async () => {
      // 1. Add milestone
      const addMlsRes = await request(app)
        .post(`/api/v1/admin/projects/${createdProjectId}/milestones`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          title: 'Core Engine & Payment Integration',
          amount: 30000,
          completionCriteria: 'Full Razorpay checkout flow with automated invoices.',
        });

      assert.equal(addMlsRes.status, 201);
      initialMilestoneId = addMlsRes.body.data.milestone.id || addMlsRes.body.data.milestone._id;

      // 2. Unlock milestone for payment
      const unlockRes = await request(app)
        .patch(`/api/v1/admin/milestones/${initialMilestoneId}/payable`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(unlockRes.status, 200);
      assert.equal(unlockRes.body.data.milestone.paymentState, 'payable');
    });
  });

  // ==========================================
  // 9. Payments, Manual Offline Entries & Refunds
  // ==========================================
  describe('9. Financial Management & Refunds', () => {
    let manualOrderRef;

    it('should record manual offline bank transfer payment', async () => {
      const res = await request(app)
        .post('/api/v1/admin/payments/record-manual')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          customerEmail: clientEmail,
          amount: 50000,
          paymentMethod: 'HDFC Direct Bank Transfer / NEFT',
          referenceNote: 'Settlement for Milestone 1 & 2 invoice',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.order.paymentStatus, 'paid');
      manualOrderRef = res.body.data.order.orderReference;
    });

    it('should initiate refund on paid order', async () => {
      const res = await request(app)
        .post('/api/v1/admin/refunds/initiate')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          orderReference: manualOrderRef,
          amount: 50000,
          reason: 'Duplicate payment adjustment',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.refund.status, 'processed');
    });
  });

  // ==========================================
  // 10. Media Library Management
  // ==========================================
  describe('10. Media Library Management', () => {
    let mediaId;

    it('should register media asset and reject invalid MIME format', async () => {
      // 1. Invalid MIME
      const invalidRes = await request(app)
        .post('/api/v1/admin/media/upload')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          title: 'Suspicious File',
          url: '/uploads/script.exe',
          mimeType: 'application/x-msdownload',
        });
      assert.equal(invalidRes.status, 400);

      // 2. Valid image registration
      const validRes = await request(app)
        .post('/api/v1/admin/media/upload')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          title: 'Pravyuk Hero Banner',
          url: '/assets/images/pravyuk-hero.svg',
          mimeType: 'image/svg+xml',
          altText: 'Pravyuk Agency Hero Graphic',
          category: 'Brand Graphics',
        });

      assert.equal(validRes.status, 201);
      mediaId = validRes.body.data.media._id || validRes.body.data.media.id;

      // 3. List media
      const listRes = await request(app)
        .get('/api/v1/admin/media')
        .set('Authorization', `Bearer ${superAdminToken}`);
      assert.equal(listRes.status, 200);

      // 4. Delete media
      const delRes = await request(app)
        .delete(`/api/v1/admin/media/${mediaId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      assert.equal(delRes.status, 200);
    });
  });

  // ==========================================
  // 11. SEO Control Center & Sitemap Generator
  // ==========================================
  describe('11. SEO Control Center', () => {
    it('should fetch and update global SEO configuration', async () => {
      const getRes = await request(app)
        .get('/api/v1/admin/seo')
        .set('Authorization', `Bearer ${superAdminToken}`);
      assert.equal(getRes.status, 200);
      assert.ok(getRes.body.data.seo.globalTitle);

      const updateRes = await request(app)
        .put('/api/v1/admin/seo')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          globalTitle: 'Pravyuk | High-Impact Website Development Agency',
          globalDescription: 'Custom website development with transparent milestones and complete source ownership.',
          canonicalUrl: 'https://pravyuk.com',
        });
      assert.equal(updateRes.status, 200);
      assert.equal(updateRes.body.data.seo.globalTitle, 'Pravyuk | High-Impact Website Development Agency');
    });

    it('should regenerate sitemap XML', async () => {
      const res = await request(app)
        .post('/api/v1/admin/seo/regenerate-sitemap')
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.data.totalUrls >= 10);
    });
  });

  // ==========================================
  // 12. Admin Users & Permissions Management
  // ==========================================
  describe('12. Administrative Users & Role Delegation', () => {
    let invitedStaffId;

    it('should invite a new staff administrator with scoped permissions', async () => {
      const res = await request(app)
        .post('/api/v1/admin/users/invite')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Junior Project Manager',
          email: 'pm.staff@pravyuk.com',
          password: 'StaffSecret#2026',
          role: 'staff',
          permissions: ['dashboard.read', 'inquiries.manage', 'projects.manage'],
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.user.role, 'staff');
      invitedStaffId = res.body.data.user._id || res.body.data.user.id;
    });

    it('should update permissions and status of invited user', async () => {
      // 1. Update permissions
      const permRes = await request(app)
        .patch(`/api/v1/admin/users/${invitedStaffId}/permissions`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          permissions: ['dashboard.read', 'inquiries.manage', 'projects.manage', 'content.manage'],
        });

      assert.equal(permRes.status, 200);
      assert.ok(permRes.body.data.user.permissions.includes('content.manage'));

      // 2. Suspend user
      const statusRes = await request(app)
        .patch(`/api/v1/admin/users/${invitedStaffId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'suspended' });

      assert.equal(statusRes.status, 200);
      assert.equal(statusRes.body.data.user.status, 'suspended');

      // 3. Delete admin user
      const delRes = await request(app)
        .delete(`/api/v1/admin/users/${invitedStaffId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(delRes.status, 200);
    });
  });

  // ==========================================
  // 13. Audit Logs & System Export
  // ==========================================
  describe('13. Audit Logs & Data Safety Export', () => {
    it('should retrieve audit log records populated by administrative actions', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data.logs));
      assert.ok(res.body.data.logs.length >= 5);
      // Verify audit record shape
      const firstLog = res.body.data.logs[0];
      assert.ok(firstLog.action);
      assert.ok(firstLog.actorEmail);
      assert.ok(firstLog.createdAt);
    });

    it('should safely export complete agency data backup as JSON', async () => {
      const res = await request(app)
        .get('/api/v1/admin/backup/export')
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.agency, 'Pravyuk');
      assert.ok(res.body.data.users);
      assert.ok(res.body.data.services);
      assert.ok(res.body.data.projects);
      assert.ok(res.body.data.orders);
    });
  });

  // ==========================================
  // 14. Admin Profile & Password Updates
  // ==========================================
  describe('14. Admin Profile & Password Modification', () => {
    it('should fetch and update admin profile', async () => {
      const getRes = await request(app)
        .get('/api/v1/admin/profile')
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(getRes.status, 200);
      assert.equal(getRes.body.data.user.email, superAdminEmail);

      const updateRes = await request(app)
        .put('/api/v1/admin/profile')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Pravyuk Chief Architect',
          phone: '+91 98765 43210',
          company: 'Pravyuk Technologies Private Limited',
        });

      assert.equal(updateRes.status, 200);
      assert.equal(updateRes.body.data.user.name, 'Pravyuk Chief Architect');
    });

    it('should change admin password and verify login with new password', async () => {
      const newPassword = 'NewSuperAdminPassword#2026';

      // 1. Change password
      const changeRes = await request(app)
        .put('/api/v1/admin/profile/password')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          currentPassword: superAdminPassword,
          newPassword,
        });

      assert.equal(changeRes.status, 200);

      // 2. Old password should fail
      const oldPwRes = await request(app).post('/api/v1/auth/login').send({
        email: superAdminEmail,
        password: superAdminPassword,
      });
      assert.equal(oldPwRes.status, 401);

      // 3. New password should authenticate
      const newPwRes = await request(app).post('/api/v1/auth/login').send({
        email: superAdminEmail,
        password: newPassword,
      });
      assert.equal(newPwRes.status, 200);
      assert.ok(newPwRes.body.data.token);
    });
  });
});
