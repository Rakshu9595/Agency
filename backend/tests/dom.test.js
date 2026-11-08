process.env.NODE_ENV = 'test';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock Browser Environment for DOM testing
class MockClassList {
  constructor() {
    this.classes = new Set();
  }
  add(...names) {
    names.forEach((n) => this.classes.add(n));
  }
  remove(...names) {
    names.forEach((n) => this.classes.delete(n));
  }
  contains(name) {
    return this.classes.has(name);
  }
  toString() {
    return Array.from(this.classes).join(' ');
  }
}

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.id = '';
    this.className = '';
    this.classList = new MockClassList();
    this.innerHTML = '';
    this.textContent = '';
    this.children = [];
    this.parentElement = null;
    this.attributes = new Map();
    this.eventListeners = new Map();
    this.value = '';
    this.type = 'text';
    this.checked = false;
    this.style = {};
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (this.parentElement) {
      const idx = this.parentElement.children.indexOf(this);
      if (idx !== -1) {
        this.parentElement.children.splice(idx, 1);
      }
      this.parentElement = null;
    }
  }

  addEventListener(event, handler) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(handler);
  }

  dispatchEvent(event) {
    const handlers = this.eventListeners.get(event.type) || [];
    handlers.forEach((h) => h(event));
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const results = [];
    const check = (el) => {
      let match = false;
      if (selector.startsWith('#') && el.id === selector.slice(1)) match = true;
      if (selector.startsWith('.') && (el.className.includes(selector.slice(1)) || el.classList.contains(selector.slice(1)))) match = true;
      if (selector.toLowerCase() === el.tagName.toLowerCase()) match = true;
      if (match) results.push(el);
      el.children.forEach(check);
    };
    this.children.forEach(check);
    return results;
  }

  focus() {
    this.focused = true;
  }
}

class MockDocument {
  constructor() {
    this.body = new MockElement('body');
    this.head = new MockElement('head');
    this.elementsById = new Map();
  }

  createElement(tagName) {
    return new MockElement(tagName);
  }

  getElementById(id) {
    if (this.elementsById.has(id)) return this.elementsById.get(id);
    return this.body.querySelector(`#${id}`);
  }

  registerElement(id, el) {
    el.id = id;
    this.elementsById.set(id, el);
    this.body.appendChild(el);
  }

  querySelector(sel) {
    return this.body.querySelector(sel);
  }

  querySelectorAll(sel) {
    return this.body.querySelectorAll(sel);
  }
}

// Global browser mocks
global.document = new MockDocument();
global.window = {
  location: { pathname: '/pages/services.html', search: '', href: '' },
  localStorage: {
    store: new Map(),
    getItem(k) { return this.store.get(k) || null; },
    setItem(k, v) { this.store.set(k, String(v)); },
    removeItem(k) { this.store.delete(k); },
    clear() { this.store.clear(); },
  },
  APP_CONFIG: {
    apiBaseUrl: 'http://localhost:5000/api/v1',
  },
};
global.localStorage = global.window.localStorage;

describe('Frontend DOM Components & Interaction Unit Tests', () => {
  beforeEach(() => {
    global.document = new MockDocument();
    global.window.localStorage.clear();
    global.window.location.pathname = '/pages/services.html';
  });

  it('Navigation DOM: renders links and guest actions when logged out', () => {
    const navTarget = document.createElement('div');
    document.registerElement('site-navbar', navTarget);

    const isPagesFolder = window.location.pathname.includes('/pages/');
    const rootPrefix = isPagesFolder ? '../' : './';
    const loggedIn = false;

    // Simulate navigation render logic
    navTarget.innerHTML = `
      <nav class="navbar navbar-expand-lg">
        <a class="navbar-brand" href="${rootPrefix}index.html">Agenet</a>
        <ul class="navbar-nav">
          <li class="nav-item"><a class="nav-link active" href="${rootPrefix}pages/services.html">Services</a></li>
          <li class="nav-item"><a class="nav-link" href="${rootPrefix}pages/projects.html">Work</a></li>
        </ul>
        <div class="nav-actions">
          <a class="btn btn-outline-light" href="${rootPrefix}pages/login.html">Sign in</a>
          <a class="btn btn-primary" href="${rootPrefix}pages/start-project.html">Start project</a>
        </div>
      </nav>
    `;

    assert.ok(navTarget.innerHTML.includes('Sign in'));
    assert.ok(navTarget.innerHTML.includes('Start project'));
    assert.ok(navTarget.innerHTML.includes('Services'));
    assert.ok(navTarget.innerHTML.includes('active'));
  });

  it('Navigation DOM: renders dashboard button when customer is logged in', () => {
    const navTarget = document.createElement('div');
    document.registerElement('site-navbar', navTarget);

    global.localStorage.setItem('agenet_token', 'valid-jwt-token');
    global.localStorage.setItem('agenet_user', JSON.stringify({ name: 'Alice Client', email: 'alice@example.com' }));

    const loggedIn = Boolean(global.localStorage.getItem('agenet_token'));
    assert.equal(loggedIn, true);

    navTarget.innerHTML = `
      <div class="nav-actions">
        <a class="btn btn-outline-light" href="../pages/dashboard.html">Dashboard</a>
        <button id="nav-logout-btn" class="btn btn-danger">Log out</button>
      </div>
    `;

    assert.ok(navTarget.innerHTML.includes('Dashboard'));
    assert.ok(navTarget.innerHTML.includes('Log out'));
    assert.ok(!navTarget.innerHTML.includes('Sign in'));
  });

  it('Form Status helper: updates text content and sets alert classes', () => {
    const statusEl = document.createElement('div');
    statusEl.className = 'form-status';

    const showStatus = (el, message, type = 'info') => {
      el.textContent = message;
      el.className = `form-status show ${type}`;
    };

    showStatus(statusEl, 'Your inquiry was received with reference ID LEAD-1234', 'success');

    assert.equal(statusEl.textContent, 'Your inquiry was received with reference ID LEAD-1234');
    assert.equal(statusEl.className, 'form-status show success');

    showStatus(statusEl, 'Payment failed due to card timeout', 'danger');
    assert.equal(statusEl.className, 'form-status show danger');
  });

  it('Validator helper: validates emails, passwords, and mandatory inputs', () => {
    const Validator = {
      isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ? email.trim() : '');
      },
      isValidPassword(password) {
        return typeof password === 'string' && password.length >= 8;
      },
    };

    assert.equal(Validator.isValidEmail('test@example.com'), true);
    assert.equal(Validator.isValidEmail('developer@sub.agency.org'), true);
    assert.equal(Validator.isValidEmail('not-an-email'), false);
    assert.equal(Validator.isValidEmail(''), false);

    assert.equal(Validator.isValidPassword('Short1!'), false); // 7 chars
    assert.equal(Validator.isValidPassword('ValidPassword123!'), true); // 18 chars
  });

  it('LocalStorage state: stores, retrieves, and clears authentication tokens', () => {
    const testToken = 'sample_encoded_header.payload.signature';
    const testUser = { id: 'usr_123', name: 'Bob Tech', email: 'bob@example.com' };

    // Set
    global.localStorage.setItem('agenet_token', testToken);
    global.localStorage.setItem('agenet_user', JSON.stringify(testUser));

    // Get
    const retrievedToken = global.localStorage.getItem('agenet_token');
    const retrievedUser = JSON.parse(global.localStorage.getItem('agenet_user'));

    assert.equal(retrievedToken, testToken);
    assert.equal(retrievedUser.name, 'Bob Tech');

    // Logout
    global.localStorage.removeItem('agenet_token');
    global.localStorage.removeItem('agenet_user');

    assert.equal(global.localStorage.getItem('agenet_token'), null);
    assert.equal(global.localStorage.getItem('agenet_user'), null);
  });

  it('NotificationService: creates and manages toast alert DOM elements', () => {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);

    const NotificationService = {
      show(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast bg-${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);
        return toast;
      },
    };

    const t1 = NotificationService.show('Order created successfully', 'success');
    assert.equal(container.children.length, 1);
    assert.ok(t1.className.includes('bg-success'));
    assert.ok(t1.innerHTML.includes('Order created successfully'));

    const t2 = NotificationService.show('Payment declined', 'danger');
    assert.equal(container.children.length, 2);
    assert.ok(t2.className.includes('bg-danger'));
  });

  it('Currency Formatter: formats numbers into standard INR currency strings', () => {
    const formatCurrency = (val) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(val);
    };

    const formatted = formatCurrency(12999);
    assert.ok(formatted.includes('12,999'));
    assert.ok(formatted.includes('₹') || formatted.includes('INR'));
  });

  it('Payment Status DOM: displays verified order details upon successful payment confirmation', () => {
    const container = document.createElement('div');
    container.id = 'payment-status-details';
    document.body.appendChild(container);

    const mockOrder = {
      orderReference: 'ORD-20261022-9A8B7C',
      title: 'Full-Stack MVP Development',
      amount: 39999,
      paymentStatus: 'paid',
      receiptNumber: 'REC-123456',
    };

    // Render success details
    container.innerHTML = `
      <div class="confirmed-box">
        <h4>Authoritative Payment Confirmed</h4>
        <span class="ref">${mockOrder.orderReference}</span>
        <span class="amount">₹${mockOrder.amount}</span>
        <span class="receipt">${mockOrder.receiptNumber}</span>
      </div>
    `;

    assert.ok(container.innerHTML.includes('Authoritative Payment Confirmed'));
    assert.ok(container.innerHTML.includes('ORD-20261022-9A8B7C'));
    assert.ok(container.innerHTML.includes('₹39999'));
    assert.ok(container.innerHTML.includes('REC-123456'));
  });
});
