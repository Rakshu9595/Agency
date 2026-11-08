# Pravyuk — Professional Website Development Agency & Client Portal

**Your Vision. Our Build.**

[![Tests](https://img.shields.io/badge/Tests-58%20Passing-brightgreen.svg)](#automated-testing)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B%20%7C%2020%2B-blue.svg)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-MongoDB%20Atlas-green.svg)](https://www.mongodb.com/atlas)
[![Payment Gateway](https://img.shields.io/badge/Payments-Razorpay%20Checkout-blueviolet.svg)](https://razorpay.com/)

Pravyuk is a modern website development agency that transforms ideas into professional digital experiences. Clients explore website development services, submit custom project briefs, receive itemized quotations, approve proposals, pay kickoff advances and milestone releases securely via Razorpay, track live development stages on private staging URLs, and launch high-converting websites with 100% code ownership.

---

## 1. Core On-Demand Business Model

```
+----------------------------------------------------------------------------------------------------+
|                               THE ON-DEMAND CLIENT JOURNEY                                         |
|                                                                                                    |
|  1. DISCOVER SERVICES & PACKAGES                                                                   |
|     Explore Landing Pages, Business Sites, E-Commerce, Custom Web Apps, and Maintenance packages.  |
|                                       |                                                            |
|                                       v                                                            |
|  2. SUBMIT PROJECT BRIEF (start-project.html)                                                      |
|     15-field brief: required pages, target audience, features, budget, and design references.      |
|     Zero upfront payment required. Instant reference ID: INQ-XXXXXX.                               |
|                                       |                                                            |
|                                       v                                                            |
|  3. AGENCY REVIEWS & ISSUES QUOTATION (admin.html)                                                 |
|     Staff evaluates requirements and issues an official proposal with fixed price, line-item       |
|     deliverables, milestone schedule, revision rounds, and warranty period.                        |
|                                       |                                                            |
|                                       v                                                            |
|  4. CLIENT REVIEWS PROPOSAL (dashboard.html)                                                       |
|     Review scope in client dashboard. Accept proposal, request modifications, or decline.          |
|                                       |                                                            |
|                                       v                                                            |
|  5. PAY KICKOFF ADVANCE (Razorpay Checkout)                                                        |
|     Pay agreed 50% deposit via UPI, Cards, or Netbanking. Project moves to Design & Coding.         |
|                                       |                                                            |
|                                       v                                                            |
|  6. TRACK SPRINT & TEST STAGING PREVIEW                                                            |
|     Live 8-stage progress tracker: Inquiry -> Review -> Quote -> Advance -> Design -> Dev -> Test  |
|                                       |                                                            |
|                                       v                                                            |
|  7. MILESTONE REVIEWS & FINAL BALANCE RELEASE                                                      |
|     Inspect deliverables on staging. Unlock and pay milestone payments. Complete final balance.    |
|                                       |                                                            |
|                                       v                                                            |
|  8. LIVE DEPLOYMENT & HANDOVER                                                                     |
|     Deploy to live custom domain with SSL. Full source code ownership transferred to client.       |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Technology Stack

- **Frontend**: HTML5, Vanilla JavaScript (Native ES Modules & browser scripts), CSS3 Custom Variables, Bootstrap 5.3.3, Bootstrap Icons. Pure web standards without heavy frameworks.
- **Backend**: Node.js (v18+), Express.js 4.x REST APIs, strict request body parsing with rawBuffer preservation for cryptographic webhook verification.
- **Database**: MongoDB Atlas with Mongoose ODM schemas, compound indexes, and automatic timestamping.
- **Payments**: Official Razorpay SDK with Standard Checkout flow (UPI, Debit/Credit Cards, Netbanking, Wallets), timing-safe HMAC-SHA256 signature verification (`crypto.timingSafeEqual`), and deduplicated webhook processing.
- **Security**: Node.js `crypto.scrypt` password hashing, HMAC-SHA256 session tokens, CORS allowlist, Helmet HTTP security headers, honeypot anti-spam, and rate limiting.
- **Testing**: Node.js native test runner (`node:test`) and Supertest.

---

## 3. Implemented Pages & Client Portals

### Public Pages
- `index.html`: Conversion-focused homepage with "Get a Website" primary CTA, 4-step on-demand process, website packages, portfolio case studies, FAQ, and footer.
- `pages/how-it-works.html`: Dedicated deep-dive into the on-demand agency workflow, milestone billing, and launch guarantees.
- `pages/start-project.html`: Comprehensive 15-field project brief submission form with honeypot spam protection.
- `pages/pricing.html`: On-demand website package tiers (Starter, Business, E-Commerce, Custom Web App).
- `pages/services.html` & `pages/service-details.html`: Service catalog with deliverables and timelines.
- `pages/projects.html` & `pages/project-details.html`: Production case studies with technical metrics.
- `pages/about.html`, `pages/contact.html`, `pages/privacy.html`, `pages/terms.html`, `pages/refund-policy.html`, `pages/404.html`.

### Client Account Pages
- `pages/register.html` & `pages/login.html`: Secure authentication.
- `pages/forgot-password.html` & `pages/reset-password.html`: Tokenized password recovery with 1-hour expiry.
- `pages/dashboard.html`: Client portal featuring:
  - **My Website Projects**: Visual 8-stage progress tracker (`Inquiry` -> `Review` -> `Quotation` -> `Awaiting Advance` -> `Design` -> `Development` -> `Testing` -> `Delivered`), staging preview URL launcher, and timeline updates.
  - **Quotations & Proposals**: Proposal inspector modal with "Accept & Pay Advance", "Request Changes", and "Reject" workflows.
  - **Milestone Payments**: Active milestones list with instant Razorpay Checkout buttons for payable milestones.
  - **Invoices & Receipts**: Verified payment history with receipt viewer.
- `pages/billing.html`: Paginated transaction ledger, automated PDF receipt generator, and refund requests.

### Agency Management Portal (`pages/admin.html`)
- **Restricted Staff Access**: Enforced by backend authentication (`role === 'admin'`). Unauthorized users are rejected with HTTP 403.
- **Inquiries Inbox**: Review incoming client briefs, filter by status, and launch the quotation builder.
- **Quote Builder**: Select inquiry, specify scope of work, total amount, advance %, and milestone breakdown to issue proposal to client.
- **Sprint & Stage Manager**: Advance projects across stages (`design` -> `development` -> `testing` -> `delivered`), configure staging URLs, and publish live deployment links.
- **Milestone Manager**: Add milestones to projects and mark them `payable` for the client.
- **Transactions & Refund Ledger**: Audit verified payments and process/reject customer refund requests.

---

## 4. REST API Reference

All endpoints are mounted under `/api/v1`:

### Client Authentication
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/auth/register` | Register account (`role: client`). Optional `adminInviteCode` grants `admin`. | No |
| `POST` | `/auth/login` | Authenticate and receive HMAC-SHA256 session token | No |
| `GET` | `/auth/me` | Fetch authenticated profile details | Bearer Token |

### Project Inquiries
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/project-inquiries` | Submit 15-field website requirement brief | Optional |
| `GET` | `/project-inquiries/mine` | Fetch customer's submitted briefs | Bearer Token |
| `GET` | `/project-inquiries/:id` | View inquiry details (Owner or Admin) | Bearer Token |
| `PATCH`| `/project-inquiries/:id` | Add notes or cancel inquiry | Bearer Token |

### Quotations & Proposals
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/quotes/mine` | List customer's received quotation proposals | Bearer Token |
| `GET` | `/quotes/:quoteReference`| View detailed quotation breakdown | Bearer Token |
| `POST`| `/quotes/:quoteReference/accept` | Approve quote -> Initializes Project in `awaiting_advance` | Bearer Token |
| `POST`| `/quotes/:quoteReference/request-changes` | Send revision feedback to agency | Bearer Token |
| `POST`| `/quotes/:quoteReference/reject` | Reject proposal | Bearer Token |

### Client Projects & Milestones
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/projects/mine` | List customer's active development projects with stages | Bearer Token |
| `GET` | `/projects/:id` | Get project details, staging URL, live URL | Bearer Token |
| `GET` | `/projects/:id/updates` | Get timeline updates and announcements | Bearer Token |
| `GET` | `/projects/:id/milestones` | Get milestone payment schedule | Bearer Token |

### Payments & Razorpay
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/payments/orders` | Create Razorpay order (Advance or Milestone) with trusted server pricing | Bearer Token |
| `POST` | `/payments/verify` | Verify Razorpay HMAC signature & mark paid | Bearer Token |
| `POST` | `/payments/webhook` | Asynchronous Razorpay webhook ingest with rawBuffer verification | Razorpay Signature |
| `GET` | `/payments/history` | Paginated transaction history | Bearer Token |
| `GET` | `/payments/:orderReference/receipt` | Downloadable official payment receipt | Bearer Token |
| `POST` | `/payments/:orderReference/refund-requests` | Request refund on paid order | Bearer Token |

### Agency Admin Operations (`/api/v1/admin`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/admin/summary` | Real-time agency KPI metrics (revenue, inquiries, sprints, quotes) | Admin Role |
| `GET` | `/admin/inquiries` | List all client briefs with status filters | Admin Role |
| `PATCH`| `/admin/inquiries/:id/status` | Update review status (`under_review`, `quoted`, `rejected`) | Admin Role |
| `POST` | `/admin/quotes` | Generate and issue quotation proposal to client | Admin Role |
| `GET` | `/admin/projects` | List all agency projects across all clients | Admin Role |
| `PATCH`| `/admin/projects/:id/stage` | Advance sprint stage (`design` -> `dev` -> `testing` -> `delivered`) | Admin Role |
| `POST` | `/admin/projects/:id/updates` | Post client timeline update with links | Admin Role |
| `POST` | `/admin/projects/:id/milestones`| Add milestone to project | Admin Role |
| `PATCH`| `/admin/milestones/:id/payable` | Mark milestone payable for client checkout | Admin Role |
| `GET` | `/admin/payments` | View verified payments ledger and refunds | Admin Role |
| `PATCH`| `/admin/refunds/:id` | Approve or reject refund request | Admin Role |

---

## 5. Automated Testing

The repository includes 9 automated test suites with 58 end-to-end and integration tests:

```bash
cd backend
npm test
```

### Verified Test Run Output:
```text
▶ On-Demand Website Agency End-to-End Workflow Tests
  ✔ Step 1: Client submits comprehensive on-demand website project inquiry (40ms)
  ✔ Step 2: Admin security enforcement rejects unauthorized access to admin endpoints (98ms)
  ✔ Step 3: Agency staff reviews inquiries and updates status to under_review (98ms)
  ✔ Step 4: Agency issues detailed quotation proposal with milestones to client (32ms)
  ✔ Step 5: Client reviews proposal, requests revisions, then accepts quotation (56ms)
  ✔ Step 6: Client pays advance deposit via verified Razorpay checkout -> Project moves to design stage (39ms)
  ✔ Step 7: Agency updates project stage to development, posts progress update, and client views timeline (23ms)
  ✔ Step 8: Milestone unlocking, payment, and final delivery workflow (51ms)
✔ On-Demand Website Agency End-to-End Workflow Tests (1563ms)

▶ Authentication & User Management Integration Tests (8 tests passing)
▶ Frontend DOM Components & Interaction Unit Tests (8 tests passing)
▶ Health and System Routes (4 tests passing)
▶ Lead Creation and Service Tests (5 tests passing)
▶ Membership & Subscription Lifecycle Tests (3 tests passing)
▶ Payment & Razorpay Integration Tests (8 tests passing)
▶ Lead Inquiry Input Validation Tests (12 tests passing)
▶ Razorpay Webhook Processing Tests (2 tests passing)

ℹ tests 58
ℹ suites 9
ℹ pass 58
ℹ fail 0
ℹ duration_ms 7221.3419
```

---

## 6. Local Setup & Quickstart

### 1. Configure Backend Environment
```bash
cd backend
cp .env.example .env
```
Populate `backend/.env`:
```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5500
ADDITIONAL_ALLOWED_ORIGINS=http://127.0.0.1:5500
MONGODB_URI=mongodb+srv://YOUR_DATABASE_CONNECTION
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
SESSION_SECRET=a_very_strong_random_secret_at_least_32_chars
ADMIN_INVITE_KEY=AGENET_ADMIN_SECRET_2026
```

### 2. Install & Start Backend
```bash
npm install
npm run dev
```

### 3. Serve Frontend
```bash
# In the root repository folder:
python -m http.server 5500
```
Open `http://localhost:5500/frontend/index.html`.

### 4. Admin Account Provisioning
To register an administrative staff account:
1. Go to `http://localhost:5500/frontend/pages/register.html`.
2. Register with your agency email and set `adminInviteCode`: `AGENET_ADMIN_SECRET_2026`.
3. Sign in to access the Agency Admin Portal at `pages/admin.html` with full operational capabilities.
