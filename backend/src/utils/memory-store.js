import { isDatabaseConnected } from '../config/db.js';
import crypto from 'node:crypto';

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

  saveUser(userData) {
    const id = userData._id ? String(userData._id) : new crypto.randomBytes(12).toString('hex');
    const record = {
      _id: id,
      id,
      ...userData,
      createdAt: userData.createdAt || new Date(),
      updatedAt: new Date(),
      toSafeJSON() {
        return {
          id: this._id,
          name: this.name,
          email: this.email,
          role: this.role || 'client',
          status: this.status || 'active',
          phone: this.phone || '',
          company: this.company || '',
          createdAt: this.createdAt,
          lastLoginAt: this.lastLoginAt,
        };
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

  findOrdersByCustomer(customerId) {
    const res = [];
    for (const o of this.orders.values()) {
      if (String(o.customerId) === String(customerId)) res.push(o);
    }
    return res.sort((a, b) => b.createdAt - a.createdAt);
  }

  // --- Payments ---
  savePayment(paymentData) {
    const id = paymentData._id ? String(paymentData._id) : new crypto.randomBytes(12).toString('hex');
    const record = {
      _id: id,
      id,
      ...paymentData,
      verifiedAt: paymentData.verifiedAt || new Date(),
      createdAt: paymentData.createdAt || new Date(),
      save: async function () { return this; }
    };
    this.payments.set(id, record);
    return record;
  }

  findPaymentByRazorpayId(payId) {
    for (const p of this.payments.values()) {
      if (p.razorpayPaymentId === payId) return p;
    }
    return null;
  }

  findPaymentByOrderId(orderId) {
    for (const p of this.payments.values()) {
      if (String(p.orderId) === String(orderId)) return p;
    }
    return null;
  }

  // --- Quotes ---
  findQuoteByReference(ref) {
    const target = ref.toUpperCase().trim();
    for (const q of this.quotes.values()) {
      if (q.quoteReference === target) return q;
    }
    return null;
  }

  findQuoteById(id) {
    return this.quotes.get(String(id)) || null;
  }

  findQuotesByCustomer(customerId) {
    const res = [];
    for (const q of this.quotes.values()) {
      if (String(q.customerId) === String(customerId)) res.push(q);
    }
    return res;
  }

  saveQuote(quoteData) {
    const id = quoteData._id ? String(quoteData._id) : new crypto.randomBytes(12).toString('hex');
    const record = {
      _id: id,
      id,
      ...quoteData,
      createdAt: quoteData.createdAt || new Date(),
      save: async function () { return this; }
    };
    this.quotes.set(id, record);
    return record;
  }

  // --- Inquiries ---
  saveInquiry(inquiryData) {
    const id = inquiryData._id ? String(inquiryData._id) : new crypto.randomBytes(12).toString('hex');
    const record = {
      _id: id,
      id,
      ...inquiryData,
      createdAt: inquiryData.createdAt || new Date(),
      save: async function () { return this; }
    };
    this.inquiries.set(id, record);
    return record;
  }

  findInquiriesByCustomer(customerId, email) {
    const res = [];
    for (const inq of this.inquiries.values()) {
      if ((customerId && String(inq.customerId) === String(customerId)) || (email && inq.email === email)) {
        res.push(inq);
      }
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

  saveMembership(data) {
    const id = data._id ? String(data._id) : new crypto.randomBytes(12).toString('hex');
    const record = {
      _id: id,
      id,
      ...data,
      save: async function () { return this; }
    };
    this.memberships.set(String(data.customerId), record);
    return record;
  }

  // --- Webhooks ---
  findWebhookEvent(eventId) {
    return this.webhooks.get(eventId) || null;
  }

  saveWebhookEvent(data) {
    const record = {
      ...data,
      save: async function () { return this; }
    };
    this.webhooks.set(data.eventId, record);
    return record;
  }

  // --- Refunds ---
  saveRefund(data) {
    const id = data._id ? String(data._id) : new crypto.randomBytes(12).toString('hex');
    const record = {
      _id: id,
      id,
      ...data,
      save: async function () { return this; }
    };
    this.refunds.set(id, record);
    return record;
  }

  findRefundsByCustomer(customerId) {
    const res = [];
    for (const r of this.refunds.values()) {
      if (String(r.customerId) === String(customerId)) res.push(r);
    }
    return res;
  }

  findRefundByOrderId(orderId) {
    for (const r of this.refunds.values()) {
      if (String(r.orderId) === String(orderId)) return r;
    }
    return null;
  }

  // --- Projects ---
  saveProject(data) {
    const id = data._id ? String(data._id) : new crypto.randomBytes(12).toString('hex');
    const record = {
      _id: id,
      id,
      stage: 'awaiting_advance',
      status: 'active',
      paidAmount: 0,
      currency: 'INR',
      ...data,
      createdAt: data.createdAt || new Date(),
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
    const target = ref.toUpperCase().trim();
    for (const p of this.projects.values()) {
      if (p.projectReference === target) return p;
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
  saveMilestone(data) {
    const id = data._id ? String(data._id) : new crypto.randomBytes(12).toString('hex');
    const record = {
      _id: id,
      id,
      approvalState: 'pending',
      paymentState: 'unbilled',
      currency: 'INR',
      ...data,
      createdAt: data.createdAt || new Date(),
      save: async function () { return this; }
    };
    this.milestones.set(id, record);
    return record;
  }

  findMilestonesByProject(projectId) {
    const res = [];
    for (const m of this.milestones.values()) {
      if (String(m.projectId) === String(projectId)) res.push(m);
    }
    return res.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  findMilestoneById(id) {
    return this.milestones.get(String(id)) || null;
  }

  findMilestoneByReference(ref) {
    const target = ref.toUpperCase().trim();
    for (const m of this.milestones.values()) {
      if (m.milestoneReference === target) return m;
    }
    return null;
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
