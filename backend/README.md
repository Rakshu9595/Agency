# Agency Website Backend

> Secure, production-ready REST API backend for a student-led software development agency website serving businesses, startups, founders, and students in India and internationally.

---

## 1. Project Overview

The **Agency Website Backend** is designed to capture, validate, rate-limit, and persist client project inquiries into MongoDB Atlas. Built strictly following clean architecture principles, it enforces separation of concerns across routes, middleware, validation schemas, controllers, business services, and database models.

Key Highlights:
- **Zero Frontend Leaks**: Never returns private internal notes, database `_id`, or status via public inquiry endpoints.
- **Honeypot Anti-Spam**: Built-in trap field (`website`) silently catches bots without requiring paid or privacy-invasive third-party CAPTCHAs.
- **Mass Assignment Protection**: Prohibits client-specified modifications to sensitive fields such as `referenceId`, `status`, `notes`, or `source`.
- **Hardened HTTP Security**: Configured with Helmet security headers, CORS origin allowlisting, request payload size limits, and rate limiting.
- **Production-Ready Clean Architecture**: Structured cleanly to enable seamless Phase 2 admin lead management integration without exposing premature or unauthenticated endpoints.

---

## 2. Technology Stack

- **Runtime**: Node.js (`>=18.0.0`, tested on Node.js v24)
- **Module System**: Native ECMAScript Modules (`"type": "module"`)
- **Web Framework**: Express.js 4.x
- **Database & ODM**: MongoDB Atlas & Mongoose 8.x
- **Schema Validation**: Zod 3.x
- **Security & Utilities**:
  - `helmet`: Security HTTP headers
  - `cors`: Cross-Origin Resource Sharing allowlisting
  - `express-rate-limit`: IP-based request throttling
  - `dotenv`: Environment variable management
- **Testing**: Node.js native test runner (`node:test`, `node:assert/strict`) & Supertest

---

## 3. Directory Structure

```text
backend/
├── package.json                   # Dependencies, engines, and npm scripts
├── package-lock.json              # Deterministic lockfile
├── .env.example                   # Environment configuration template
├── .gitignore                     # Git exclusion rules for secrets and node_modules
├── README.md                      # Complete documentation & deployment guide
├── server.js                      # Application entrypoint & HTTP lifecycle manager
├── src/
│   ├── app.js                     # Express application builder & middleware wiring
│   ├── config/
│   │   └── db.js                  # MongoDB Atlas connection lifecycle & URI masking
│   ├── models/
│   │   └── Lead.js                # Mongoose schema, validation constraints & indexes
│   ├── routes/
│   │   ├── health.routes.js       # Health and readiness check routes
│   │   ├── lead.routes.js         # Public lead capture routes
│   │   └── admin.routes.js        # Phase 2 administrative routes
│   ├── controllers/
│   │   ├── health.controller.js   # Health check controller handlers
│   │   ├── lead.controller.js     # Lead creation controller handler
│   │   └── admin.controller.js    # Phase 2 admin placeholder controller handlers
│   ├── services/
│   │   └── lead.service.js        # Business logic, persistence & ID collision retry
│   ├── validators/
│   │   └── lead.validator.js      # Zod validation schema, mass assignment & honeypot guard
│   ├── middleware/
│   │   ├── error.middleware.js    # Global centralized error handler
│   │   ├── not-found.middleware.js# 404 handler for undefined routes
│   │   ├── rate-limit.middleware.js# IP rate limiting for public submissions
│   │   └── auth.middleware.js     # Phase 2 authentication guard
│   └── utils/
│       ├── generate-reference.js  # Server-controlled unique reference ID generator
│       └── api-response.js        # Standardized JSON response and AppError utilities
└── tests/
    ├── health.test.js             # Liveness, readiness, and 404 tests
    ├── lead.test.js               # Persistence, mass assignment, rate limiting tests
    └── validation.test.js         # Strict input schema & honeypot validation tests
```

---

## 4. Environment Variables

Create a `.env` file in the `backend/` root based on `.env.example`:

| Variable | Type | Default | Description |
|---|---|---|---|
| `PORT` | Number | `5000` | Port for the HTTP server |
| `NODE_ENV` | String | `development` | Runtime environment (`development`, `production`, `test`) |
| `MONGODB_URI` | String | *Required in Prod* | MongoDB Atlas connection connection string |
| `FRONTEND_URL` | String | `http://localhost:5500` | Primary frontend origin permitted for CORS requests |
| `ADDITIONAL_ALLOWED_ORIGINS` | String | `""` | Comma-delimited list of additional permitted CORS origins |
| `RATE_LIMIT_WINDOW_MS` | Number | `900000` | Rate limiting sliding window in ms (900,000 ms = 15 mins) |
| `RATE_LIMIT_MAX_REQUESTS` | Number | `10` | Maximum requests permitted per IP per rate limiting window |

> **Security Rule**: Never commit `.env` or credentials to version control. The `.gitignore` file already excludes `.env` and local environment files.

---

## 5. Quick Start & Local Development

### Prerequisites
- Node.js version 18.0.0 or higher
- npm 9.0.0 or higher
- A free MongoDB Atlas cluster or local MongoDB instance

### Installation
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### Starting the Server

**Development Mode (auto-reload on file change):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

Once running, the server will output:
```text
=========================================
 Agency Website Backend API
 Environment : development
 Server Port : 5000
 Health URL  : http://localhost:5000/api/v1/health
 Leads URL   : http://localhost:5000/api/v1/leads
=========================================
```

---

## 6. API Reference

All routes are versioned under the `/api/v1` namespace.

### A. Health & Readiness

#### 1. Liveness Check
- **Endpoint**: `GET /api/v1/health`
- **Access**: Public
- **Description**: Verifies that the Express API process is running.
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Agency API is running"
  }
  ```

#### 2. Readiness Check
- **Endpoint**: `GET /api/v1/health/ready`
- **Access**: Public / Orchestrator probe
- **Description**: Verifies active connectivity to MongoDB Atlas without exposing infrastructure details.
- **Response (`200 OK` when ready / `503 Service Unavailable` when offline)**:
  ```json
  {
    "success": true,
    "message": "Agency API and database are ready",
    "data": {
      "status": "ready"
    }
  }
  ```

---

### B. Lead Inquiries (Public)

#### 1. Submit Project Inquiry
- **Endpoint**: `POST /api/v1/leads`
- **Access**: Public (Subject to Rate Limiting: 10 requests / 15 minutes)
- **Headers**: `Content-Type: application/json`

#### Request Body Schema
```json
{
  "name": "Acme Ventures",
  "email": "contact@acme.example.com",
  "phone": "+91 9876543210",
  "customerType": "startup",
  "service": "website-development",
  "projectTitle": "Investor Pitch Portal",
  "description": "Looking for a high-converting website built with modern UI, mobile responsiveness, and SEO.",
  "budgetAmount": 25000,
  "budgetCurrency": "INR",
  "deadline": "2026-12-31",
  "referenceLinks": [
    "https://example.com/inspiration"
  ],
  "preferredContact": "email",
  "privacyConsent": true,
  "website": ""
}
```

#### Field Specifications & Validation Rules
| Field | Type | Required | Description & Constraints |
|---|---|---|---|
| `name` | String | **Yes** | 2 to 100 characters, trimmed. |
| `email` | String | **Yes** | Valid email, trimmed, normalized to lowercase, max 254 chars. |
| `phone` | String | No | Max 25 chars. Optional contact telephone/mobile number. |
| `customerType` | String | **Yes** | Enum: `business`, `startup`, `student`, `individual`, `other`. |
| `service` | String | **Yes** | Enum: `website-development`, `ecommerce-development`, `custom-software`, `ai-automation`, `ui-ux-design`, `student-project-support`, `other`. |
| `projectTitle` | String | No | Max 150 chars. |
| `description` | String | **Yes** | 10 to 5,000 chars. Project details and requirements. |
| `budgetAmount` | Number | No | Non-negative number (`>= 0`). |
| `budgetCurrency` | String | No | Enum: `INR`, `USD`, `EUR`, `GBP`, `CAD`, `AUD`. Default: `INR`. |
| `deadline` | Date/String | No | Valid ISO date format. |
| `referenceLinks` | Array<String> | No | Max 10 URLs. Each item must be a valid `http://` or `https://` URL. |
| `preferredContact` | String | No | Enum: `email`, `phone`, `whatsapp`. Default: `email`. |
| `privacyConsent` | Boolean | **Yes** | Must be strictly `true`. |
| `website` | String | No | **Honeypot field**. Must remain empty. If filled, request is rejected. |

#### Prohibited Fields (Mass-Assignment Protection)
Any request attempting to supply or modify `referenceId`, `status`, `notes`, `source`, `_id`, or `createdAt` is explicitly rejected with `400 Bad Request`.

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "Your project inquiry has been received.",
  "data": {
    "referenceId": "LEAD-20261010-8A3F12"
  }
}
```

#### Validation Error Response (`400 Bad Request`)
```json
{
  "success": false,
  "message": "Validation failed for inquiry submission",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email address"
    },
    {
      "field": "privacyConsent",
      "message": "You must agree to the privacy policy to submit an inquiry"
    }
  ]
}
```

#### Rate Limit Exceeded Response (`429 Too Many Requests`)
```json
{
  "success": false,
  "message": "Too many inquiries submitted from this IP address. Please try again later.",
  "errors": [
    {
      "message": "Rate limit exceeded"
    }
  ]
}
```

#### Database / Internal Error Response (`500 Internal Server Error`)
```json
{
  "success": false,
  "message": "An unexpected error occurred. Please try again later."
}
```

---

### C. Admin Endpoints (Phase 2 Architecture)

The backend reserves the following routes for future administrative operations. In accordance with security specifications, all endpoints require authentication and currently return `501 Not Implemented` to prevent exposing unauthenticated mock data.

- `POST /api/v1/admin/auth/login` (`501 Not Implemented`)
- `POST /api/v1/admin/auth/logout` (`501 Not Implemented`)
- `GET /api/v1/admin/leads` (`501 Not Implemented`)
- `GET /api/v1/admin/leads/:id` (`501 Not Implemented`)
- `PATCH /api/v1/admin/leads/:id` (`501 Not Implemented`)

---

## 7. Frontend Integration Contract

The frontend website is built with HTML, CSS, vanilla JavaScript, and Bootstrap 5. Follow the integration pattern below to connect the frontend inquiry form to the backend:

### Integration Guide

1. **Configurable Base URL**: Keep the API base URL in a global configuration object so it can switch between local (`http://localhost:5000`) and production deployment (`https://agency-backend.onrender.com`).
2. **Honeypot Hidden Field**: Include a hidden input named `website` with CSS `display: none;` and `tabindex="-1" autocomplete="off"`. Genuine users won't fill it; bots will.
3. **Form Submission Handler**:
   - Prevent default form submission (`e.preventDefault()`).
   - Disable the submit button and show a loading spinner.
   - Send JSON with `Content-Type: application/json`.
   - On `201 Created`: Display the server-generated `referenceId` in a confirmation card and reset form fields.
   - On `400 Bad Request`: Display field-level validation feedback without clearing entered user input.
   - On `429 Too Many Requests`: Inform the user that too many submissions were made.
   - On `500` or Network failure: Show a helpful message stating the server is currently unreachable.

### Example Vanilla JavaScript Implementation

```javascript
// frontend/js/inquiry-form.js
const API_CONFIG = {
  BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api/v1'
    : 'https://agency-website-backend.onrender.com/api/v1',
};

const form = document.getElementById('lead-inquiry-form');
const submitBtn = document.getElementById('submit-btn');
const feedbackContainer = document.getElementById('form-feedback');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Clear previous validation alerts
  clearFormErrors();
  feedbackContainer.innerHTML = '';

  // Prevent duplicate submissions & show loading spinner
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Submitting...`;

  // Collect form data
  const formData = new FormData(form);
  const payload = {
    name: formData.get('name')?.trim() || '',
    email: formData.get('email')?.trim() || '',
    phone: formData.get('phone')?.trim() || '',
    customerType: formData.get('customerType') || 'business',
    service: formData.get('service') || 'website-development',
    projectTitle: formData.get('projectTitle')?.trim() || '',
    description: formData.get('description')?.trim() || '',
    budgetAmount: formData.get('budgetAmount') ? Number(formData.get('budgetAmount')) : null,
    budgetCurrency: formData.get('budgetCurrency') || 'INR',
    deadline: formData.get('deadline') || null,
    referenceLinks: formData.get('referenceLinks')
      ? formData.get('referenceLinks').split(',').map((u) => u.trim()).filter(Boolean)
      : [],
    preferredContact: formData.get('preferredContact') || 'email',
    privacyConsent: form.querySelector('#privacyConsent')?.checked === true,
    website: formData.get('website') || '', // Honeypot field
  };

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.status === 201 && result.success) {
      // Success: Show confirmation card with reference ID
      feedbackContainer.innerHTML = `
        <div class="alert alert-success mt-3 shadow-sm" role="alert">
          <h5 class="alert-heading fw-bold">Inquiry Received!</h5>
          <p class="mb-1">Thank you! Your reference number is <strong>${result.data.referenceId}</strong>.</p>
          <small class="text-muted">Please save this reference ID for future communication.</small>
        </div>
      `;
      form.reset();
    } else if (response.status === 400 && result.errors) {
      // Highlight field-level errors
      result.errors.forEach((err) => {
        highlightFieldError(err.field, err.message);
      });
      feedbackContainer.innerHTML = `
        <div class="alert alert-danger mt-3" role="alert">
          Please correct the highlighted fields and try again.
        </div>
      `;
    } else {
      // Other status (429, 500)
      feedbackContainer.innerHTML = `
        <div class="alert alert-warning mt-3" role="alert">
          ${result.message || 'Unable to submit inquiry at this time. Please try again later.'}
        </div>
      `;
    }
  } catch (networkError) {
    feedbackContainer.innerHTML = `
      <div class="alert alert-danger mt-3" role="alert">
        <strong>Offline:</strong> Our servers are currently unreachable. Please check your internet connection or email us directly.
      </div>
    `;
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `Send Inquiry`;
  }
});

function highlightFieldError(fieldName, message) {
  const input = form.querySelector(`[name="${fieldName}"]`);
  if (input) {
    input.classList.add('is-invalid');
    let feedback = input.nextElementSibling;
    if (feedback && feedback.classList.contains('invalid-feedback')) {
      feedback.textContent = message;
    }
  }
}

function clearFormErrors() {
  form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
}
```

---

## 8. Database Setup (MongoDB Atlas)

1. **Sign Up / Log In**:
   Create a free MongoDB Atlas account at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. **Create a Free Cluster**:
   Choose the **M0 Shared** tier in your closest region (e.g., `AWS - Mumbai (ap-south-1)`).
3. **Database Access (Least-Privilege User)**:
   - Go to **Security > Database Access**.
   - Click **Add New Database User**.
   - Authentication Method: **Password**.
   - Set a username and secure password (avoid special characters like `@` or `#` in passwords to prevent URI encoding issues, or encode them with `encodeURIComponent`).
   - Under **Database User Privileges**, select **Read and write to any database** or restrict specifically to the `agency_db` database.
4. **Network Access**:
   - Go to **Security > Network Access**.
   - Click **Add IP Address**.
   - For local development and Render hosting: Add `0.0.0.0/0` (Allow Access from Anywhere) with a description like `Render & Dev Access`.
5. **Get Connection String**:
   - Go to **Deployment > Database**.
   - Click **Connect** > **Drivers** (Node.js).
   - Copy the URI:
     `mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/agency_db?retryWrites=true&w=majority`
   - Paste into `.env` as `MONGODB_URI`.

---

## 9. Automated Testing

The backend includes a test suite covering 21 automated assertions across health probes, validation schemas, honeypot spam protection, mass assignment prevention, database failure handling, rate limiting, and production error masking.

Tests run natively via Node's test runner and do not require external database access or live Atlas credentials.

### Run Tests
```bash
# Run all automated tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Verified Test Suite
```text
▶ Health and System Routes
  ✔ GET /api/v1/health should return 200 with running message
  ✔ GET /api/v1/health/ready should report readiness without leaking credentials
  ✔ GET /api/v1/non-existent-route should return 404 Not Found
  ✔ Phase 2 Admin routes should return 501 Not Implemented
✔ Health and System Routes

▶ Lead Creation and Service Tests
  ✔ should successfully create a lead and return 201 with referenceId
  ✔ should handle database persistence failure safely with 500 and no stack trace leak
  ✔ should prevent mass assignment of protected status and notes fields
  ✔ should enforce rate limiting when enabled
  ✔ should return safe generic error in production mode
✔ Lead Creation and Service Tests

▶ Lead Inquiry Input Validation Tests
  ✔ should reject request missing required name
  ✔ should reject invalid email format
  ✔ should reject request missing service
  ✔ should reject invalid service enum value
  ✔ should reject empty or too-short description
  ✔ should reject when privacyConsent is false
  ✔ should reject invalid reference URL format
  ✔ should reject negative budget amount
  ✔ should reject oversized field values
  ✔ should reject spam submission when honeypot website field is populated
  ✔ should reject attempted mass assignment of status, referenceId, or notes
  ✔ should reject malformed JSON request bodies with 400
✔ Lead Inquiry Input Validation Tests

ℹ tests 21 | pass 21 | fail 0
```

---

## 10. Deployment Guide (Render)

The application is fully prepared for continuous deployment on [Render](https://render.com) or similar platforms (Railway, Fly.io, Heroku).

### Step-by-Step Instructions:

1. **Push Code to GitHub**:
   Ensure `.env` is ignored and all code inside `agency-website/backend/` is committed.
2. **Create New Web Service on Render**:
   - Log in to your Render dashboard.
   - Click **New +** > **Web Service**.
   - Connect your GitHub repository.
3. **Configure Settings**:
   - **Name**: `agency-website-backend`
   - **Root Directory**: `backend` (if repository root contains the whole project)
   - **Environment**: `Node`
   - **Region**: Closest to your users (e.g., `Singapore` or `Frankfurt`)
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. **Configure Environment Variables in Render**:
   In the **Environment Variables** tab, add:
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (Render sets its own port automatically)
   - `MONGODB_URI`: *Your verified MongoDB Atlas connection string*
   - `FRONTEND_URL`: *Your deployed frontend origin (e.g. `https://myagency.vercel.app`)*
   - `ADDITIONAL_ALLOWED_ORIGINS`: *Any additional frontend domains*
   - `RATE_LIMIT_WINDOW_MS`: `900000`
   - `RATE_LIMIT_MAX_REQUESTS`: `10`
5. **Configure Health Check**:
   - Health Check Path: `/api/v1/health`
6. **Deploy**:
   - Click **Create Web Service**.
   - Once deployed, test the health check:
     `https://agency-website-backend.onrender.com/api/v1/health`
   - Verify it responds with:
     ```json
     { "success": true, "message": "Agency API is running" }
     ```

---

## 11. Security Architecture

1. **Helmet HTTP Headers**: Strips `X-Powered-By`, enables DNS prefetch control, frameguard, and download restrictions.
2. **Strict CORS Allowlist**: Blocks unapproved browser origins from making cross-origin requests.
3. **Strict Payload Limits**: Request bodies are restricted to `10kb` to protect against denial-of-service memory exhaustion attacks.
4. **NoSQL Injection Immunity**: Queries are built exclusively through strictly validated Zod schemas; raw user objects are never passed directly to MongoDB query operators (`$ne`, `$gt`, etc.).
5. **No Stack Trace / Credential Leaks**: In production mode (`NODE_ENV=production`), internal stack traces and Mongoose errors are stripped, returning a sanitized generic message.
6. **Graceful Lifecycle Management**: Listens for `SIGINT` and `SIGTERM` signals to cleanly disconnect from MongoDB before closing the HTTP process.

---

## 12. Implemented Features & Modules

### Core Platform Modules
- **Authentication & Security (`/api/v1/auth`)**: Cryptographic `scrypt` password hashing, signed HMAC-SHA256 session tokens, rate limiting, and 1-hour secure password reset tokens.
- **Service Catalog (`/api/v1/services`)**: Public service packages with price tiers, deliverables, estimated timelines, and instant checkout triggers.
- **Project Inquiries (`/api/v1/project-inquiries`)**: Detailed custom project brief capture with timeline, budget tiers, and honeypot spam protection.
- **Approved Quotes (`/api/v1/quotes`)**: Administrative quote issuance, line-item breakdowns, milestone definitions, and acceptance workflows.
- **Payments & Razorpay Integration (`/api/v1/payments`)**:
  - Authoritative server-side price calculation with anti-tampering guards.
  - Razorpay order creation (`/payments/orders`).
  - Cryptographic signature verification using `crypto.timingSafeEqual` (`/payments/verify`).
  - Webhook ingestion with raw Buffer preservation and deduplication ledger (`/payments/webhook`).
  - Customer payment history, transaction references, and downloadable receipt generation.
  - Customer refund requests with policy validation and tracking.
- **Memberships & Subscriptions (`/api/v1/memberships`)**:
  - Plans catalog (Monthly, Yearly, Lifetime) with entitlement management.
  - Subscription checkout and automatic payment discount calculation.
  - Cancellation scheduling retaining active access through the end of the billing period.
- **Customer Dashboard (`/api/v1/dashboard/summary`)**:
  - Real-time customer metrics, active projects, quote alerts, and billing totals.
- **Automated Testing Suite (`npm test`)**:
  - 8 test suites containing 50 unit and integration tests across DOM, Auth, Health, Leads, Validation, Payments, Memberships, and Webhooks. All 50 passing.

