import { isDatabaseConnected } from '../config/db.js';
import crypto from 'node:crypto';
import { DEFAULT_SERVICES } from '../config/seed-data.js';

/**
 * In-memory state store for tests and offline sandbox execution
 * when live MongoDB Atlas connection is not active.
 */
class MemoryStore {
  constructor() {
    this.users = new Map();
    this.orders = new Map();
    this.payments = new Map();
    this.quotes = new Map();
    this.inquiries = new Map();
    this.memberships = new Map();
    this.webhooks = new Map();
    this.refunds = new Map();
    this.projects = new Map();
    this.milestones = new Map();
    this.projectUpdates = new Map();

    // New CMS & Administrative Store Collections
    this.services = new Map();
    this.portfolio = new Map();
    this.blog = new Map();
    this.testimonials = new Map();
    this.faqs = new Map();
    this.media = new Map();
    this.content = new Map();
    this.settings = new Map();
    this.auditLogs = [];

    this.initDefaults();
  }

  initDefaults() {
    // 1. Seed Services
    DEFAULT_SERVICES.forEach((s) => {
      const id = s.slug;
      this.services.set(id, {
        _id: id,
        id,
        ...s,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // 2. Seed Portfolio
    const defaultProjects = [
      {
        id: 'fintech-flow',
        title: 'FintechFlow',
        slug: 'fintech-flow',
        category: 'Full-Stack Platform',
        clientName: 'FintechFlow Inc',
        tagline: 'Automated Reconciliation and Real-Time Reporting Core',
        description: 'Comprehensive financial dashboard facilitating real-time transactions, automated invoice reconciliation, and customer analytics.',
        techStack: ['Node.js', 'Express', 'MongoDB', 'Razorpay', 'Bootstrap 5'],
        thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
        liveUrl: 'https://example.com/fintechflow',
        isFeatured: true,
        status: 'published',
        order: 1,
      },
      {
        id: 'nexus-commerce',
        title: 'Nexus Store',
        slug: 'nexus-commerce',
        category: 'E-Commerce Development',
        clientName: 'Nexus Apparel',
        tagline: 'Ultra-Fast Headless Storefront with Razorpay',
        description: 'High-converting digital apparel storefront with sub-second page transitions, dynamic cart drawer, and 1-click Razorpay checkout.',
        techStack: ['JavaScript', 'HTML5', 'CSS3', 'Razorpay Checkout', 'REST API'],
        thumbnail: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80',
        liveUrl: 'https://example.com/nexus',
        isFeatured: true,
        status: 'published',
        order: 2,
      },
      {
        id: 'medconnect-ai',
        title: 'MedConnect',
        slug: 'medconnect-ai',
        category: 'AI Integration',
        clientName: 'MedConnect Labs',
        tagline: 'Clinical Protocol and Document Search Assistant',
        description: 'Intelligent search assistant aiding researchers in synthesizing 12,000+ medical journals with cited protocols.',
        techStack: ['Node.js', 'Python', 'Vector Search', 'MongoDB'],
        thumbnail: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
        liveUrl: 'https://example.com/medconnect',
        isFeatured: true,
        status: 'published',
        order: 3,
      },
    ];

    defaultProjects.forEach((p) => {
      this.portfolio.set(p.id, { _id: p.id, ...p, createdAt: new Date() });
    });

    // 3. Seed Homepage CMS Content
    this.content.set('homepage', {
      eyebrow: 'Modern Website Development Agency',
      heroHeading: 'Your Vision. Our Build.',
      heroDescription: 'We design and develop professional websites that help businesses, startups, and creators establish a powerful digital presence. From high-converting landing pages to bespoke full-stack web applications, we transform ideas into refined digital experiences.',
      primaryCtaText: 'Start Your Project',
      primaryCtaLink: 'pages/start-project.html',
      secondaryCtaText: 'Explore Our Work',
      secondaryCtaLink: 'pages/projects.html',
      turnaroundStat: '3-7 Days',
      ownershipStat: '100%',
      paymentStat: 'Milestone',
      sections: {
        hero: true,
        whyUs: true,
        services: true,
        process: true,
        portfolio: true,
        pricing: true,
        faq: true,
        ctaBanner: true,
      },
    });

    // 4. Seed Navigation Items
    this.content.set('navigation', [
      { id: '1', label: 'Home', url: 'index.html', order: 1, isEnabled: true },
      { id: '2', label: 'How It Works', url: 'pages/how-it-works.html', order: 2, isEnabled: true },
      { id: '3', label: 'Services', url: 'pages/services.html', order: 3, isEnabled: true },
      { id: '4', label: 'Portfolio', url: 'pages/projects.html', order: 4, isEnabled: true },
      { id: '5', label: 'Pricing & Quotes', url: 'pages/pricing.html', order: 5, isEnabled: true },
      { id: '6', label: 'Articles', url: 'pages/blog.html', order: 6, isEnabled: true },
      { id: '7', label: 'About', url: 'pages/about.html', order: 7, isEnabled: true },
      { id: '8', label: 'Contact', url: 'pages/contact.html', order: 8, isEnabled: true },
    ]);

    // 5. Seed Footer Content
    this.content.set('footer', {
      tagline: 'Your Vision. Our Build.',
      description: 'Pravyuk transforms ideas into professional digital experiences. We design, build, and deploy bespoke websites, applications, and e-commerce platforms with clear milestones and full code ownership.',
      address: 'Bengaluru, Karnataka, India',
      email: 'hello@pravyuk.com',
      copyright: '© 2026 Pravyuk. All rights reserved. Your Vision. Our Build.',
      socialLinks: {
        twitter: 'https://twitter.com/pravyuk',
        github: 'https://github.com/pravyuk',
        linkedin: 'https://linkedin.com/company/pravyuk',
      },
    });

    // 6. Seed Site Settings
    this.settings.set('global', {
      general: {
        siteName: 'Pravyuk',
        tagline: 'Your Vision. Our Build.',
        brandPositioning: 'Pravyuk is a modern website development agency that transforms ideas into professional digital experiences.',
        logoUrl: '/assets/images/pravyuk-logo-horizontal.svg',
        faviconUrl: '/assets/icons/favicon.svg',
        primaryColor: '#171717',
        accentColor: '#A58A58',
        mutedGreen: '#526B56',
        defaultCurrency: 'INR',
        currencySymbol: '₹',
        timezone: 'Asia/Kolkata',
      },
      contact: {
        businessEmail: 'hello@pravyuk.com',
        supportEmail: 'support@pravyuk.com',
        phone: '+91 (080) 4120-8890',
        address: 'Bengaluru, Karnataka, India',
        socials: {
          twitter: 'https://twitter.com/pravyuk',
          github: 'https://github.com/pravyuk',
          linkedin: 'https://linkedin.com/company/pravyuk',
        },
      },
      business: {
        isAcceptingInquiries: true,
        pricingVisible: true,
        maintenanceMode: false,
      },
      seo: {
        globalTitle: 'Pravyuk | Professional Website Design & Development Agency',
        globalDescription: 'Pravyuk helps businesses, startups, and creators build professional websites, e-commerce stores, landing pages, and custom web applications. Your Vision. Our Build.',
        canonicalUrl: 'https://pravyuk.com',
        ogImage: '/assets/images/pravyuk-og.jpg',
      },
    });

    // 7. Seed FAQs
    const defaultFaqs = [
      {
        id: 'faq-1',
        question: 'How does the Pravyuk quotation process work?',
        answer: 'Submit your project brief through our Start Your Project form. Our engineering team reviews your required pages, design complexity, integrations, and timeline, then issues a detailed proposal with fixed pricing and milestone dates directly to your dashboard within 24 hours.',
        category: 'Quotations',
        status: 'published',
        order: 1,
      },
      {
        id: 'faq-2',
        question: 'When do I make payments?',
        answer: 'You never pay upfront before reviewing and accepting our proposal. Once you approve the quote, you pay an advance deposit via Razorpay to initiate development. Subsequent payments occur only as agreed milestones are delivered and verified on private staging.',
        category: 'Payments',
        status: 'published',
        order: 2,
      },
      {
        id: 'faq-3',
        question: 'Do I own the complete source code?',
        answer: 'Yes, 100%. Upon final project milestone completion, you receive full intellectual property ownership, clean source repositories, design files, and production hosting credentials with zero vendor lock-in.',
        category: 'Ownership',
        status: 'published',
        order: 3,
      },
      {
        id: 'faq-4',
        question: 'What payment methods do you accept?',
        answer: 'We accept UPI (Google Pay, PhonePe, Paytm, BHIM), all major Credit and Debit Cards (Visa, Mastercard, RuPay), Netbanking across 50+ banks, and Wallets via our secure Razorpay integration with automated receipts.',
        category: 'Payments',
        status: 'published',
        order: 4,
      },
    ];

    defaultFaqs.forEach((f) => this.faqs.set(f.id, { _id: f.id, ...f, createdAt: new Date() }));
  }

  clear() {
    this.users.clear();
    this.orders.clear();
    this.payments.clear();
    this.quotes.clear();
    this.inquiries.clear();
    this.memberships.clear();
    this.webhooks.clear();
    this.refunds.clear();
    this.projects.clear();
    this.milestones.clear();
    this.projectUpdates.clear();
    this.services.clear();
    this.portfolio.clear();
    this.blog.clear();
    this.testimonials.clear();
    this.faqs.clear();
    this.media.clear();
    this.content.clear();
    this.settings.clear();
    this.auditLogs = [];
    this.initDefaults();
  }

  // --- Users ---
  findUserByEmail(email) {
    if (!email) return null;
    const normalized = email.toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.email === normalized) return u;
    }
    return null;
  }

  findUserById(id) {
    return this.users.get(String(id)) || null;
  }

  getAllUsers() {
    return Array.from(this.users.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  getAllAdminUsers() {
    return Array.from(this.users.values()).filter(
      (u) => u.role === 'admin' || u.role === 'super_admin' || u.role === 'staff'
    );
  }

  saveUser(userData) {
    const id = userData._id ? String(userData._id) : new crypto.randomBytes(12).toString('hex');
    const role = userData.role || 'client';
    let permissions = userData.permissions;
    if (!permissions) {
      if (role === 'super_admin') permissions = ['*'];
      else if (role === 'admin') {
        permissions = [
          'dashboard.read',
          'customers.read',
          'services.manage',
          'pricing.manage',
          'portfolio.manage',
          'inquiries.manage',
          'quotations.manage',
          'projects.manage',
          'payments.read',
          'content.manage',
          'seo.manage',
        ];
      } else if (role === 'staff') {
        permissions = ['dashboard.read', 'inquiries.manage', 'projects.manage'];
      } else {
        permissions = [];
      }
    }

    const record = {
      _id: id,
      id,
      ...userData,
      role,
      permissions,
      status: userData.status || 'active',
      failedLoginAttempts: userData.failedLoginAttempts || 0,
      lockUntil: userData.lockUntil || null,
      createdAt: userData.createdAt || new Date(),
      updatedAt: new Date(),
      toSafeJSON() {
        return {
          id: this._id,
          name: this.name,
          email: this.email,
          role: this.role || 'client',
          permissions: this.permissions || [],
          status: this.status || 'active',
          phone: this.phone || '',
          company: this.company || '',
          createdAt: this.createdAt,
          lastLoginAt: this.lastLoginAt,
        };
      },
      save: async function () {
        return this;
      },
    };
    this.users.set(id, record);
    return record;
  }

  // --- Orders ---
  findOrderByRazorpayId(rzpId) {
    for (const o of this.orders.values()) {
      if (o.razorpayOrderId === rzpId) return o;
    }
    return null;
  }

  findOrderByReference(ref) {
    const target = ref.toUpperCase().trim();
    for (const o of this.orders.values()) {
      if (o.orderReference === target) return o;
    }
    return null;
  }

  findOrdersByCustomer(customerId) {
    const res = [];
    for (const o of this.orders.values()) {
      if (String(o.customerId) === String(customerId)) res.push(o);
    }
    return res.sort((a, b) => b.createdAt - a.createdAt);
  }

  saveOrder(orderData) {
    const id = orderData._id ? String(orderData._id) : new crypto.randomBytes(12).toString('hex');
    const record = {
      _id: id,
      id,
      ...orderData,
      createdAt: orderData.createdAt || new Date(),
      updatedAt: new Date(),
      save: async function () { return this; }
    };
    this.orders.set(id, record);
    return record;
  }

  // --- Payments ---
  findPaymentByRazorpayId(rzpPaymentId) {
    for (const p of this.payments.values()) {
      if (p.razorpayPaymentId === rzpPaymentId) return p;
    }
    return null;
  }

  findPaymentByOrderId(orderId) {
    for (const p of this.payments.values()) {
      if (String(p.orderId) === String(orderId)) return p;
    }
    return null;
  }

  savePayment(payData) {
    const id = payData._id ? String(payData._id) : new crypto.randomBytes(12).toString('hex');
    const record = {
      _id: id,
      id,
      ...payData,
      createdAt: payData.createdAt || new Date(),
      updatedAt: new Date(),
      save: async function () { return this; }
    };
    this.payments.set(id, record);
    return record;
  }

  findPaymentsByCustomer(customerId) {
    const res = [];
    for (const p of this.payments.values()) {
      if (String(p.customerId) === String(customerId)) res.push(p);
    }
    return res.sort((a, b) => b.createdAt - a.createdAt);
  }

  // --- Quotes ---
  findQuoteByReference(ref) {
    if (!ref) return null;
    const norm = ref.toUpperCase().trim();
    for (const q of this.quotes.values()) {
      if (
        (q.quoteReference && q.quoteReference.toUpperCase().trim() === norm) ||
        (q.referenceId && q.referenceId.toUpperCase().trim() === norm)
      ) {
        return q;
      }
    }
    return null;
  }

  findQuoteById(id) {
    return this.quotes.get(String(id)) || null;
  }

  saveQuote(quoteData) {
    const id = quoteData._id ? String(quoteData._id) : new crypto.randomBytes(12).toString('hex');
    const record = {
      _id: id,
      id,
      ...quoteData,
      createdAt: quoteData.createdAt || new Date(),
      updatedAt: new Date(),
      save: async function () { return this; }
    };
    this.quotes.set(id, record);
    return record;
  }

  findQuotesByCustomer(customerId) {
    const res = [];
    for (const q of this.quotes.values()) {
      if (String(q.customerId) === String(customerId)) res.push(q);
    }
    return res.sort((a, b) => b.createdAt - a.createdAt);
  }

  // --- Inquiries ---
  findInquiryByReference(ref) {
    for (const i of this.inquiries.values()) {
      if (i.referenceId === ref) return i;
    }
    return null;
  }

  findInquiryById(id) {
    return this.inquiries.get(String(id)) || null;
  }

  saveInquiry(inquiryData) {
    const id = inquiryData._id ? String(inquiryData._id) : new crypto.randomBytes(12).toString('hex');
    const record = {
      _id: id,
      id,
      ...inquiryData,
      createdAt: inquiryData.createdAt || new Date(),
      updatedAt: new Date(),
      save: async function () { return this; }
    };
    this.inquiries.set(id, record);
    return record;
  }

  findInquiriesByEmail(email) {
    const norm = String(email).toLowerCase().trim();
    const res = [];
    for (const i of this.inquiries.values()) {
      if (i.email === norm) res.push(i);
    }
    return res.sort((a, b) => b.createdAt - a.createdAt);
  }

  // --- Memberships ---
  findMembershipByCustomer(customerId) {
    for (const m of this.memberships.values()) {
      if (String(m.customerId) === String(customerId)) return m;
    }
    return null;
  }

  saveMembership(memData) {
    const id = memData._id ? String(memData._id) : new crypto.randomBytes(12).toString('hex');
    const record = {
      _id: id,
      id,
      ...memData,
      createdAt: memData.createdAt || new Date(),
      updatedAt: new Date(),
      save: async function () { return this; }
    };
    this.memberships.set(id, record);
    return record;
  }

  // --- Webhook Events ---
  findWebhookEvent(eventId) {
    return this.webhooks.get(String(eventId)) || null;
  }

  saveWebhookEvent(data) {
    const id = String(data.eventId || crypto.randomBytes(8).toString('hex'));
    const record = {
      _id: id,
      id,
      ...data,
      createdAt: data.createdAt || new Date(),
      save: async function () { return this; }
    };
    this.webhooks.set(id, record);
    return record;
  }

  hasWebhookProcessed(eventId) {
    return this.webhooks.has(String(eventId));
  }

  recordWebhookEvent(eventData) {
    const id = String(eventData.eventId || eventData.id || crypto.randomBytes(8).toString('hex'));
    this.webhooks.set(id, { ...eventData, processedAt: new Date() });
    return this.webhooks.get(id);
  }

  // --- Refunds ---
  saveRefund(refundData) {
    const id = refundData._id ? String(refundData._id) : new crypto.randomBytes(12).toString('hex');
    const record = {
      _id: id,
      id,
      ...refundData,
      createdAt: refundData.createdAt || new Date(),
      updatedAt: new Date(),
      save: async function () { return this; }
    };
    this.refunds.set(id, record);
    return record;
  }

  findRefundById(id) {
    return this.refunds.get(String(id)) || null;
  }

  findRefundByReference(ref) {
    if (!ref) return null;
    const norm = ref.toUpperCase().trim();
    for (const r of this.refunds.values()) {
      if (r.refundReference && r.refundReference.toUpperCase().trim() === norm) return r;
    }
    return null;
  }

  // --- Projects ---
  saveProject(projectData) {
    const id = projectData._id ? String(projectData._id) : new crypto.randomBytes(12).toString('hex');
    const record = {
      _id: id,
      id,
      milestones: [],
      ...projectData,
      createdAt: projectData.createdAt || new Date(),
      updatedAt: new Date(),
      save: async function () { return this; }
    };
    this.projects.set(id, record);
    return record;
  }

  findProjectById(id) {
    return this.projects.get(String(id)) || null;
  }

  findProjectByReference(ref) {
    if (!ref) return null;
    const norm = ref.toUpperCase().trim();
    for (const p of this.projects.values()) {
      if (p.projectReference && p.projectReference.toUpperCase().trim() === norm) return p;
    }
    return null;
  }

  findProjectsByCustomer(customerId) {
    const res = [];
    for (const p of this.projects.values()) {
      if (String(p.customerId) === String(customerId)) res.push(p);
    }
    return res.sort((a, b) => b.createdAt - a.createdAt);
  }

  getAllProjects() {
    return Array.from(this.projects.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  // --- Milestones ---
  saveMilestone(milestoneData) {
    const id = milestoneData._id ? String(milestoneData._id) : new crypto.randomBytes(12).toString('hex');
    const record = {
      _id: id,
      id,
      ...milestoneData,
      createdAt: milestoneData.createdAt || new Date(),
      updatedAt: new Date(),
      save: async function () { return this; }
    };
    this.milestones.set(id, record);
    return record;
  }

  findMilestoneById(id) {
    return this.milestones.get(String(id)) || null;
  }

  findMilestoneByReference(ref) {
    if (!ref) return null;
    const norm = ref.toUpperCase().trim();
    for (const m of this.milestones.values()) {
      if (m.milestoneReference && m.milestoneReference.toUpperCase().trim() === norm) return m;
    }
    return null;
  }

  findMilestonesByProject(projectId) {
    const res = [];
    for (const m of this.milestones.values()) {
      if (String(m.projectId) === String(projectId)) res.push(m);
    }
    return res.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  // --- Project Updates ---
  saveProjectUpdate(data) {
    const id = data._id ? String(data._id) : new crypto.randomBytes(12).toString('hex');
    const record = {
      _id: id,
      id,
      attachments: [],
      ...data,
      createdAt: data.createdAt || new Date(),
      save: async function () { return this; }
    };
    this.projectUpdates.set(id, record);
    return record;
  }

  findUpdatesByProject(projectId) {
    const res = [];
    for (const u of this.projectUpdates.values()) {
      if (String(u.projectId) === String(projectId)) res.push(u);
    }
    return res.sort((a, b) => b.createdAt - a.createdAt);
  }

  // --- Services (CMS) ---
  getAllServices() {
    return Array.from(this.services.values());
  }

  getServiceById(id) {
    return this.services.get(String(id)) || null;
  }

  getServiceBySlug(slug) {
    for (const s of this.services.values()) {
      if (s.slug === slug) return s;
    }
    return null;
  }

  saveService(data) {
    const id = data._id ? String(data._id) : data.slug || new crypto.randomBytes(12).toString('hex');
    const record = {
      _id: id,
      id,
      ...data,
      updatedAt: new Date(),
      save: async function () { return this; }
    };
    this.services.set(id, record);
    return record;
  }

  deleteService(id) {
    return this.services.delete(String(id));
  }

  // --- Portfolio (CMS) ---
  getAllPortfolio() {
    return Array.from(this.portfolio.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getPortfolioById(id) {
    return this.portfolio.get(String(id)) || null;
  }

  savePortfolio(data) {
    const id = data._id ? String(data._id) : (data.slug || new crypto.randomBytes(12).toString('hex'));
    const record = {
      _id: id,
      id,
      ...data,
      updatedAt: new Date(),
      save: async function () { return this; }
    };
    this.portfolio.set(id, record);
    return record;
  }

  deletePortfolio(id) {
    return this.portfolio.delete(String(id));
  }

  // --- Blog (CMS) ---
  getAllBlogPosts() {
    return Array.from(this.blog.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  getBlogPostById(id) {
    return this.blog.get(String(id)) || null;
  }

  saveBlogPost(data) {
    const id = data._id ? String(data._id) : (data.slug || new crypto.randomBytes(12).toString('hex'));
    const record = {
      _id: id,
      id,
      ...data,
      createdAt: data.createdAt || new Date(),
      updatedAt: new Date(),
      save: async function () { return this; }
    };
    this.blog.set(id, record);
    return record;
  }

  deleteBlogPost(id) {
    return this.blog.delete(String(id));
  }

  // --- Testimonials & FAQs ---
  getAllTestimonials() {
    return Array.from(this.testimonials.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  saveTestimonial(data) {
    const id = data._id ? String(data._id) : new crypto.randomBytes(12).toString('hex');
    const record = { _id: id, id, ...data, updatedAt: new Date(), save: async function () { return this; } };
    this.testimonials.set(id, record);
    return record;
  }

  deleteTestimonial(id) {
    return this.testimonials.delete(String(id));
  }

  getAllFaqs() {
    return Array.from(this.faqs.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  saveFaq(data) {
    const id = data._id ? String(data._id) : new crypto.randomBytes(12).toString('hex');
    const record = { _id: id, id, ...data, updatedAt: new Date(), save: async function () { return this; } };
    this.faqs.set(id, record);
    return record;
  }

  deleteFaq(id) {
    return this.faqs.delete(String(id));
  }

  // --- Media Library ---
  getAllMedia() {
    return Array.from(this.media.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  saveMedia(data) {
    const id = data._id ? String(data._id) : new crypto.randomBytes(12).toString('hex');
    const record = { _id: id, id, ...data, createdAt: new Date(), save: async function () { return this; } };
    this.media.set(id, record);
    return record;
  }

  deleteMedia(id) {
    return this.media.delete(String(id));
  }

  // --- Website CMS Content ---
  getContent(key) {
    return this.content.get(String(key)) || null;
  }

  saveContent(key, data, user = 'admin') {
    this.content.set(String(key), data);
    return { key, data, lastUpdatedBy: user, updatedAt: new Date() };
  }

  // --- Site Settings ---
  getSettings() {
    return this.settings.get('global') || {};
  }

  saveSettings(data, user = 'admin') {
    const current = this.getSettings();
    const updated = {
      ...current,
      ...data,
      general: { ...(current.general || {}), ...(data.general || {}) },
      contact: { ...(current.contact || {}), ...(data.contact || {}) },
      business: { ...(current.business || {}), ...(data.business || {}) },
      seo: { ...(current.seo || {}), ...(data.seo || {}) },
      lastUpdatedBy: user,
      updatedAt: new Date(),
    };
    this.settings.set('global', updated);
    return updated;
  }

  // --- Audit Logs ---
  logAction(entry) {
    const record = {
      id: new crypto.randomBytes(8).toString('hex'),
      ...entry,
      createdAt: entry.createdAt || new Date(),
    };
    this.auditLogs.unshift(record);
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
    return record;
  }

  getAuditLogs(query = {}) {
    let logs = [...this.auditLogs];
    if (query.action) logs = logs.filter((l) => l.action.toLowerCase().includes(query.action.toLowerCase()));
    if (query.resourceType) logs = logs.filter((l) => l.resourceType === query.resourceType);
    if (query.actorEmail) logs = logs.filter((l) => l.actorEmail?.toLowerCase().includes(query.actorEmail.toLowerCase()));
    return logs;
  }

  // --- Admin Utilities ---
  getAllInquiries() {
    return Array.from(this.inquiries.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  getAllQuotes() {
    return Array.from(this.quotes.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  getAllOrders() {
    return Array.from(this.orders.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  getAllRefunds() {
    return Array.from(this.refunds.values()).sort((a, b) => b.createdAt - a.createdAt);
  }
}

export const memoryStore = new MemoryStore();
export { isDatabaseConnected };
