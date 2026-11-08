/**
 * PRAVYUK SUPER ADMIN DASHBOARD ENGINE
 * Brand Tagline: "Your Vision. Our Build."
 * Complete operations for CMS, Services, Pricing, Projects, Financials, SEO, and Security.
 */

let currentUser = null;
let cachedInquiries = [];
let cachedProjects = [];
let cachedServices = [];
let cachedPortfolio = [];
let cachedBlog = [];

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Session verification
    const token = localStorage.getItem('pravyuk_token') || localStorage.getItem('xevruniq_token') || localStorage.getItem('agenet_token');
    if (!token) {
      window.location.href = 'login.html?redirect=admin.html';
      return;
    }

    const meRes = await apiRequest('/auth/me');
    if (!meRes.success || !meRes.data || !meRes.data.user) {
      window.location.href = 'login.html?redirect=admin.html';
      return;
    }

    currentUser = meRes.data.user;

    // 2. Role permission check (super_admin, admin, staff)
    if (!['super_admin', 'admin', 'staff'].includes(currentUser.role)) {
      document.getElementById('admin-app').classList.add('d-none');
      document.getElementById('admin-forbidden-view').classList.remove('d-none');
      return;
    }

    // 3. Render user details in sidebar
    setupActorDetails();

    // 4. Bind forms & initial load
    bindGlobalForms();
    await loadAdminSummary();
    await loadAdminInquiries();
  } catch (err) {
    console.error('Admin Initialization Failed:', err);
    document.getElementById('admin-app')?.classList.add('d-none');
    document.getElementById('admin-forbidden-view')?.classList.remove('d-none');
  }
});

function setupActorDetails() {
  const nameEl = document.getElementById('actor-name');
  const roleEl = document.getElementById('actor-role-badge');
  const avatarEl = document.getElementById('actor-avatar');

  if (nameEl) nameEl.textContent = currentUser.name || 'Pravyuk Administrator';
  if (roleEl) roleEl.textContent = (currentUser.role || 'ADMIN').toUpperCase().replace('_', ' ');

  if (avatarEl) {
    const initials = (currentUser.name || 'SA')
      .split(' ')
      .map((p) => p[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
    avatarEl.textContent = initials;
  }

  // Hide Super Admin exclusive modules if role is staff or regular admin
  if (currentUser.role !== 'super_admin') {
    const usersLink = document.getElementById('nav-users-link');
    const auditLink = document.getElementById('nav-audit-link');
    if (usersLink) usersLink.style.display = 'none';
    if (auditLink) auditLink.style.display = 'none';
  }
}

function bindGlobalForms() {
  const quoteForm = document.getElementById('create-quote-form');
  if (quoteForm) quoteForm.addEventListener('submit', handleCreateQuoteSubmit);
}

// ==============================================
// NAVIGATION & TAB SWITCHING
// ==============================================

window.toggleSidebar = function () {
  document.getElementById('adminSidebar')?.classList.toggle('show');
};

window.switchTab = async function (tabId) {
  // Hide all views
  document.querySelectorAll('.admin-view').forEach((v) => v.classList.add('d-none'));

  // Remove active from links
  document.querySelectorAll('.sidebar-nav-link').forEach((link) => link.classList.remove('active'));

  // Target view
  const targetView = document.getElementById(`view-${tabId}`);
  if (targetView) targetView.classList.remove('d-none');

  // Activate clicked link
  const activeLink = Array.from(document.querySelectorAll('.sidebar-nav-link')).find((l) =>
    l.getAttribute('onclick')?.includes(`'${tabId}'`)
  );
  if (activeLink) activeLink.classList.add('active');

  // Update topbar title
  const titleEl = document.getElementById('current-tab-title');
  if (titleEl && activeLink) {
    titleEl.textContent = activeLink.textContent.trim().split('\n')[0];
  }

  // Close mobile sidebar
  document.getElementById('adminSidebar')?.classList.remove('show');

  // Trigger lazy-loading for the active tab
  switch (tabId) {
    case 'overview':
      await loadAdminSummary();
      break;
    case 'inquiries':
      await loadAdminInquiries();
      break;
    case 'quotes':
      await loadAdminQuotes();
      break;
    case 'projects':
      await loadAdminProjects();
      break;
    case 'customers':
      await loadAdminCustomers();
      break;
    case 'cms-homepage':
      await loadHomepageContent();
      break;
    case 'cms-nav-footer':
      await loadNavAndFooterContent();
      break;
    case 'services':
      await loadAdminServices();
      break;
    case 'portfolio':
      await loadAdminPortfolio();
      break;
    case 'blog':
      await loadAdminBlog();
      break;
    case 'testimonials':
      await loadAdminTestimonialsAndFaqs();
      break;
    case 'media':
      await loadAdminMedia();
      break;
    case 'payments':
      await loadAdminPayments();
      break;
    case 'seo':
      await loadSeoSettings();
      break;
    case 'settings':
      await loadGlobalSettings();
      break;
    case 'users':
      await loadAdminUsers();
      break;
    case 'audit':
      await loadAuditLogs();
      break;
    case 'profile':
      await loadAdminProfile();
      break;
  }
};

window.triggerRefresh = async function () {
  notify('Refreshing administrative metrics...', 'info');
  await loadAdminSummary();
  notify('Dashboard data updated successfully', 'success');
};

// ==============================================
// 1. OVERVIEW & SUMMARY
// ==============================================

async function loadAdminSummary() {
  try {
    const res = await apiRequest('/admin/summary');
    if (res.success && res.data) {
      const { metrics, recentInquiries, recentProjects, recentPayments } = res.data;

      // Update KPI counters
      const revEl = document.getElementById('stat-revenue');
      const inqEl = document.getElementById('stat-inquiries');
      const prjEl = document.getElementById('stat-projects');
      const quoEl = document.getElementById('stat-quotes');

      if (revEl) revEl.textContent = `₹${(metrics.totalRevenue || 0).toLocaleString('en-IN')}`;
      if (inqEl) inqEl.textContent = metrics.newInquiries || 0;
      if (prjEl) prjEl.textContent = metrics.activeProjects || 0;
      if (quoEl) quoEl.textContent = metrics.pendingQuotes || 0;

      // Badges
      const bInq = document.getElementById('badge-inquiries');
      const bPrj = document.getElementById('badge-projects');
      if (bInq) bInq.textContent = metrics.newInquiries || 0;
      if (bPrj) bPrj.textContent = metrics.activeProjects || 0;

      // Recent inquiries table
      renderOverviewInquiries(recentInquiries || []);
      // Recent projects table
      renderOverviewProjects(recentProjects || []);
      // Recent payments table
      renderOverviewPayments(recentPayments || []);
    }
  } catch (err) {
    console.error('Summary Load Error:', err);
  }
}

function renderOverviewInquiries(list) {
  const tbody = document.getElementById('overview-recent-inquiries');
  if (!tbody) return;
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-muted">No pending inquiries.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map((inq) => `
    <tr>
      <td class="font-monospace text-warning small">${inq.referenceId}</td>
      <td><div class="fw-bold text-white">${inq.name}</div><small class="text-muted">${inq.email}</small></td>
      <td><span class="badge bg-dark border border-secondary">${inq.websiteType || inq.service}</span></td>
      <td><span class="badge bg-primary bg-opacity-25 text-primary border border-primary border-opacity-25">${inq.status}</span></td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-light" onclick="switchTab('inquiries')"><i class="bi bi-arrow-right"></i></button>
      </td>
    </tr>
  `).join('');
}

function renderOverviewProjects(list) {
  const tbody = document.getElementById('overview-recent-projects');
  if (!tbody) return;
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-muted">No active project sprints.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map((p) => `
    <tr>
      <td class="font-monospace text-info small">${p.projectReference}</td>
      <td class="fw-bold text-white">${p.title}</td>
      <td><span class="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-25">${p.stage}</span></td>
      <td class="text-white small">₹${(p.totalBudget || p.totalAmount || 0).toLocaleString('en-IN')}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-light" onclick="switchTab('projects')"><i class="bi bi-kanban"></i></button>
      </td>
    </tr>
  `).join('');
}

function renderOverviewPayments(list) {
  const tbody = document.getElementById('overview-recent-payments');
  if (!tbody) return;
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-3 text-muted">No verified transactions yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map((o) => `
    <tr>
      <td class="font-monospace text-success fw-bold">${o.orderReference}</td>
      <td>${o.customerId?.name || o.metadata?.customerEmail || 'Client'}</td>
      <td class="text-white">${o.title || o.orderType}</td>
      <td class="fw-bold text-success">₹${(o.amount || 0).toLocaleString('en-IN')}</td>
      <td><span class="badge bg-success">Paid</span></td>
      <td class="font-monospace small text-muted">${o.razorpayPaymentId || o.razorpayOrderId || 'DIRECT_SETTLEMENT'}</td>
    </tr>
  `).join('');
}

// ==============================================
// 2. PROJECT INQUIRIES MANAGEMENT
// ==============================================

window.loadAdminInquiries = async function () {
  const tbody = document.getElementById('inquiries-table-tbody');
  const status = document.getElementById('inquiry-status-select')?.value || '';

  try {
    const url = status ? `/admin/inquiries?status=${status}` : '/admin/inquiries';
    const res = await apiRequest(url);

    if (res.success && res.data) {
      cachedInquiries = res.data.inquiries || [];
      renderInquiriesTable(cachedInquiries);
    }
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">${err.message}</td></tr>`;
  }
};

function renderInquiriesTable(list) {
  const tbody = document.getElementById('inquiries-table-tbody');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No inquiries found.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((inq) => `
    <tr>
      <td class="font-monospace text-warning fw-bold">${inq.referenceId}</td>
      <td>
        <div class="fw-bold text-white">${inq.name}</div>
        <small class="text-muted">${inq.email} | ${inq.phone || 'No phone'}</small>
      </td>
      <td>
        <span class="badge bg-dark border border-secondary">${inq.websiteType || inq.service}</span>
        <div class="text-muted small text-truncate" style="max-width: 200px;">${inq.description}</div>
      </td>
      <td class="text-white">${inq.budgetRange || 'Flexible'}</td>
      <td>${inq.assignedStaffName ? `<span class="badge bg-info text-dark">${inq.assignedStaffName}</span>` : '<span class="text-muted small">Unassigned</span>'}</td>
      <td><span class="badge bg-primary">${inq.status}</span></td>
      <td class="text-end">
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-light" title="Assign Staff" onclick="promptAssignInquiry('${inq._id || inq.id}')"><i class="bi bi-person-check"></i></button>
          <button class="btn btn-outline-warning" title="Add Note" onclick="promptAddInquiryNote('${inq._id || inq.id}')"><i class="bi bi-chat-left-text"></i></button>
          <button class="btn btn-primary" title="Issue Proposal" onclick="openCreateQuoteModal('${inq.referenceId}')"><i class="bi bi-pencil-square me-1"></i> Quote</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.filterInquiriesTable = function () {
  const search = document.getElementById('inquiry-search-input')?.value.toLowerCase().trim() || '';
  const filtered = cachedInquiries.filter(
    (i) =>
      i.referenceId?.toLowerCase().includes(search) ||
      i.name?.toLowerCase().includes(search) ||
      i.email?.toLowerCase().includes(search) ||
      i.service?.toLowerCase().includes(search)
  );
  renderInquiriesTable(filtered);
};

window.promptAssignInquiry = async function (id) {
  const staffName = prompt('Enter staff member name to assign to this inquiry:', currentUser.name || 'Lead Architect');
  if (!staffName) return;

  try {
    const res = await apiRequest(`/admin/inquiries/${id}/assign`, {
      method: 'PATCH',
      body: { assignedStaffName: staffName, assignedStaffId: currentUser.id },
    });
    notify(res.message || 'Staff assigned', 'success');
    await loadAdminInquiries();
  } catch (err) {
    notify(err.message, 'error');
  }
};

window.promptAddInquiryNote = async function (id) {
  const note = prompt('Add internal team note to this inquiry:');
  if (!note || note.trim().length < 2) return;

  try {
    const res = await apiRequest(`/admin/inquiries/${id}/notes`, {
      method: 'POST',
      body: { note },
    });
    notify('Internal note appended', 'success');
  } catch (err) {
    notify(err.message, 'error');
  }
};

// ==============================================
// 3. QUOTATIONS & PROPOSALS
// ==============================================

window.loadAdminQuotes = async function () {
  const tbody = document.getElementById('quotes-table-tbody');
  try {
    const res = await apiRequest('/admin/quotes');
    if (res.success && res.data) {
      const quotes = res.data.quotes || [];
      if (quotes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No quotations issued yet.</td></tr>`;
        return;
      }
      tbody.innerHTML = quotes.map((q) => `
        <tr>
          <td class="font-monospace text-info fw-bold">${q.quoteReference}</td>
          <td><div class="fw-bold text-white">${q.projectTitle}</div><small class="text-muted">${q.service}</small></td>
          <td>${q.customerId?.name || 'Customer'}</td>
          <td class="fw-bold text-white">₹${(q.totalAmount || 0).toLocaleString('en-IN')}</td>
          <td class="text-warning">₹${(q.advanceAmount || 0).toLocaleString('en-IN')} (${q.advancePercentage || 50}%)</td>
          <td><span class="badge bg-${q.status === 'approved' ? 'success' : (q.status === 'rejected' ? 'danger' : 'primary')}">${q.status}</span></td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-light" onclick="alert('Proposal Scope:\n\n' + (${JSON.stringify(q.scopeOfWork || 'No scope specified')}))"><i class="bi bi-eye"></i></button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">${err.message}</td></tr>`;
  }
};

window.openDirectQuoteModal = function () {
  const inquiryIdEl = document.getElementById('quote-inquiry-id');
  const titleEl = document.getElementById('quote-project-title');
  const totalEl = document.getElementById('quote-total-amount');
  const scopeEl = document.getElementById('quote-scope');

  if (inquiryIdEl) inquiryIdEl.value = '';
  if (titleEl) titleEl.value = 'Bespoke Web Platform Build';
  if (totalEl) totalEl.value = '45000';
  if (scopeEl) scopeEl.value = 'Full responsive design, Razorpay checkout integration, 5 pages, and admin dashboard.';

  const modal = new bootstrap.Modal(document.getElementById('createQuoteModal'));
  modal.show();
};

window.openCreateQuoteModal = function (referenceId) {
  const inq = cachedInquiries.find((i) => i.referenceId === referenceId);
  if (!inq) return;

  document.getElementById('quote-inquiry-id').value = inq._id || inq.id;
  document.getElementById('quote-customer-id').value = inq.customerId || '';
  document.getElementById('quote-project-title').value = `${inq.websiteType || inq.service} - ${inq.name}`;
  document.getElementById('quote-service').value = inq.service || 'custom-web-development';
  document.getElementById('quote-scope').value = `Development brief:\n${inq.description}\n\nDeliverables:\n- Bespoke UI/UX Design\n- Mobile-first Frontend\n- Secure Razorpay Payment Integration\n- Full Source Code Handover`;

  const modal = new bootstrap.Modal(document.getElementById('createQuoteModal'));
  modal.show();
};

async function handleCreateQuoteSubmit(e) {
  e.preventDefault();
  const inquiryId = document.getElementById('quote-inquiry-id').value;
  const projectTitle = document.getElementById('quote-project-title').value;
  const service = document.getElementById('quote-service').value;
  const totalAmount = Number(document.getElementById('quote-total-amount').value);
  const advancePercentage = Number(document.getElementById('quote-advance-pct').value);
  const scopeOfWork = document.getElementById('quote-scope').value;

  try {
    const res = await apiRequest('/admin/quotes', {
      method: 'POST',
      body: {
        inquiryId: inquiryId || undefined,
        projectTitle,
        service,
        totalAmount,
        advancePercentage,
        scopeOfWork,
      },
    });

    notify(res.message || 'Quotation created successfully!', 'success');
    bootstrap.Modal.getInstance(document.getElementById('createQuoteModal'))?.hide();
    await loadAdminQuotes();
    await loadAdminSummary();
  } catch (err) {
    notify(err.message, 'error');
  }
}

// ==============================================
// 4. PROJECTS & MILESTONE TRACKING
// ==============================================

window.loadAdminProjects = async function () {
  const container = document.getElementById('projects-accordion');
  try {
    const res = await apiRequest('/admin/projects');
    if (res.success && res.data) {
      cachedProjects = res.data.projects || [];
      if (cachedProjects.length === 0) {
        container.innerHTML = `<div class="text-center py-4 text-muted">No active project sprints currently.</div>`;
        return;
      }

      container.innerHTML = cachedProjects.map((p, idx) => `
        <div class="card bg-dark border-secondary border-opacity-25 mb-3 p-3 rounded-3">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
            <div>
              <span class="font-monospace text-warning fw-bold me-2">${p.projectReference}</span>
              <strong class="text-white fs-6">${p.title}</strong>
              <span class="badge bg-warning bg-opacity-25 text-warning ms-2 border border-warning border-opacity-25">${p.stage}</span>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-warning" onclick="openUpdateStageModal('${p.projectReference}', '${p.stage}', '${p.stagingUrl || ''}', '${p.liveUrl || ''}')"><i class="bi bi-arrow-repeat me-1"></i> Update Stage</button>
              <button class="btn btn-sm btn-outline-info" onclick="promptAddMilestone('${p._id || p.id}')"><i class="bi bi-plus-circle me-1"></i> Add Milestone</button>
            </div>
          </div>
          <div class="row g-2 small text-muted">
            <div class="col-md-4"><i class="bi bi-person me-1"></i> Customer: <strong class="text-white">${p.customerId?.name || p.customerName || 'Client'}</strong></div>
            <div class="col-md-4"><i class="bi bi-currency-rupee me-1"></i> Total Budget: <strong class="text-white">₹${(p.totalBudget || p.totalAmount || 0).toLocaleString('en-IN')}</strong></div>
            <div class="col-md-4"><i class="bi bi-link-45deg me-1"></i> Staging: ${p.stagingUrl ? `<a href="${p.stagingUrl}" target="_blank" class="text-info">${p.stagingUrl}</a>` : 'Not deployed'}</div>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    if (container) container.innerHTML = `<div class="text-danger py-4">${err.message}</div>`;
  }
};

window.openCreateProjectModal = function () {
  const modal = new bootstrap.Modal(document.getElementById('createProjectModal'));
  modal.show();
};

window.submitCreateProject = async function () {
  const title = document.getElementById('new-prj-title').value;
  const customerEmail = document.getElementById('new-prj-email').value;
  const totalBudget = document.getElementById('new-prj-budget').value;
  const mlsTitle = document.getElementById('new-prj-mls-title').value;
  const mlsAmount = document.getElementById('new-prj-mls-amount').value;

  if (!title || !customerEmail) {
    notify('Project title and customer email are required', 'warning');
    return;
  }

  try {
    const res = await apiRequest('/admin/projects', {
      method: 'POST',
      body: {
        title,
        customerEmail,
        totalBudget,
        initialMilestone: mlsTitle && mlsAmount ? { title: mlsTitle, amount: mlsAmount } : undefined,
      },
    });

    notify(res.message || 'Project created successfully', 'success');
    bootstrap.Modal.getInstance(document.getElementById('createProjectModal'))?.hide();
    await loadAdminProjects();
    await loadAdminSummary();
  } catch (err) {
    notify(err.message, 'error');
  }
};

window.openUpdateStageModal = function (projectRef, stage, stagingUrl, liveUrl) {
  document.getElementById('stage-project-ref').value = projectRef;
  document.getElementById('stage-select').value = stage || 'development';
  document.getElementById('stage-staging-url').value = stagingUrl || '';
  document.getElementById('stage-live-url').value = liveUrl || '';
  document.getElementById('stage-note').value = '';

  const modal = new bootstrap.Modal(document.getElementById('updateStageModal'));
  modal.show();
};

window.submitProjectStageUpdate = async function () {
  const projectRef = document.getElementById('stage-project-ref').value;
  const stage = document.getElementById('stage-select').value;
  const stagingUrl = document.getElementById('stage-staging-url').value;
  const liveUrl = document.getElementById('stage-live-url').value;
  const note = document.getElementById('stage-note').value;

  try {
    const res = await apiRequest(`/admin/projects/${projectRef}/stage`, {
      method: 'PATCH',
      body: { stage, stagingUrl, liveUrl, note },
    });

    notify(res.message || 'Stage updated successfully', 'success');
    bootstrap.Modal.getInstance(document.getElementById('updateStageModal'))?.hide();
    await loadAdminProjects();
  } catch (err) {
    notify(err.message, 'error');
  }
};

window.promptAddMilestone = async function (projectId) {
  const title = prompt('Milestone Title: (e.g. Frontend Coding & Razorpay Checkout)');
  if (!title) return;
  const amount = prompt('Milestone Amount (INR):', '15000');
  if (!amount) return;

  try {
    const res = await apiRequest(`/admin/projects/${projectId}/milestones`, {
      method: 'POST',
      body: { title, amount: Number(amount) },
    });
    notify(res.message || 'Milestone added', 'success');
    await loadAdminProjects();
  } catch (err) {
    notify(err.message, 'error');
  }
};

// ==============================================
// 5. CUSTOMER MANAGEMENT
// ==============================================

window.loadAdminCustomers = async function () {
  const tbody = document.getElementById('customers-table-tbody');
  const search = document.getElementById('customer-search-input')?.value || '';
  const status = document.getElementById('customer-status-filter')?.value || '';

  try {
    let url = '/admin/customers';
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await apiRequest(url);
    if (res.success && res.data) {
      const customers = res.data.customers || [];
      if (customers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No customers found.</td></tr>`;
        return;
      }

      tbody.innerHTML = customers.map((c) => `
        <tr>
          <td class="fw-bold text-white">${c.name}</td>
          <td>${c.email}</td>
          <td>${c.company || c.phone || '—'}</td>
          <td><span class="badge bg-secondary">${c.projectCount || 0}</span></td>
          <td class="text-success fw-bold">₹${(c.totalSpent || 0).toLocaleString('en-IN')}</td>
          <td><span class="badge bg-${c.status === 'active' ? 'success' : 'danger'}">${c.status}</span></td>
          <td class="text-end">
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-light" onclick="viewCustomerDetail('${c.id || c._id}')"><i class="bi bi-eye"></i></button>
              <button class="btn btn-outline-${c.status === 'active' ? 'danger' : 'success'}" onclick="toggleCustomerStatus('${c.id || c._id}', '${c.status}')">
                <i class="bi bi-${c.status === 'active' ? 'slash-circle' : 'check-circle'}"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">${err.message}</td></tr>`;
  }
};

window.viewCustomerDetail = async function (id) {
  const modal = new bootstrap.Modal(document.getElementById('customerDetailModal'));
  const body = document.getElementById('customerDetailModalBody');
  body.innerHTML = '<div class="text-center py-4 text-muted">Loading profile and history...</div>';
  modal.show();

  try {
    const res = await apiRequest(`/admin/customers/${id}`);
    if (res.success && res.data) {
      const { customer, inquiries, quotes, projects, orders } = res.data;
      body.innerHTML = `
        <div class="mb-4">
          <h5 class="text-white fw-bold">${customer.name}</h5>
          <div class="text-muted small">${customer.email} | ${customer.phone || 'No phone'} | Status: <span class="badge bg-${customer.status === 'active' ? 'success' : 'danger'}">${customer.status}</span></div>
        </div>
        <div class="row g-3 mb-3">
          <div class="col-sm-4"><div class="p-2 bg-black rounded border border-secondary text-center"><small class="text-muted d-block">Inquiries</small><strong class="fs-5 text-primary">${inquiries.length}</strong></div></div>
          <div class="col-sm-4"><div class="p-2 bg-black rounded border border-secondary text-center"><small class="text-muted d-block">Quotes</small><strong class="fs-5 text-info">${quotes.length}</strong></div></div>
          <div class="col-sm-4"><div class="p-2 bg-black rounded border border-secondary text-center"><small class="text-muted d-block">Projects</small><strong class="fs-5 text-warning">${projects.length}</strong></div></div>
        </div>
      `;
    }
  } catch (err) {
    body.innerHTML = `<div class="text-danger py-4">${err.message}</div>`;
  }
};

window.toggleCustomerStatus = async function (id, currentStatus) {
  const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
  const confirmMsg = nextStatus === 'suspended' ? 'Are you sure you want to suspend this customer account?' : 'Reactivate customer account?';
  if (!confirm(confirmMsg)) return;

  try {
    const res = await apiRequest(`/admin/customers/${id}/status`, {
      method: 'PATCH',
      body: { status: nextStatus },
    });
    notify(res.message || 'Status updated', 'success');
    await loadAdminCustomers();
  } catch (err) {
    notify(err.message, 'error');
  }
};

// ==============================================
// 6. HOMEPAGE CMS
// ==============================================

async function loadHomepageContent() {
  try {
    const res = await apiRequest('/admin/content/homepage');
    if (res.success && res.data && res.data.content) {
      const c = res.data.content;
      document.getElementById('cms-hero-eyebrow').value = c.eyebrow || '';
      document.getElementById('cms-hero-heading').value = c.heroHeading || '';
      document.getElementById('cms-hero-description').value = c.heroDescription || '';
      document.getElementById('cms-primary-cta-text').value = c.primaryCtaText || '';
      document.getElementById('cms-primary-cta-link').value = c.primaryCtaLink || '';
      document.getElementById('cms-stat-turnaround').value = c.turnaroundStat || '';
      document.getElementById('cms-stat-ownership').value = c.ownershipStat || '';
      document.getElementById('cms-stat-payment').value = c.paymentStat || '';
    }
  } catch (err) {
    console.error('Homepage CMS Error:', err);
  }
}

window.saveHomepageContent = async function () {
  const data = {
    eyebrow: document.getElementById('cms-hero-eyebrow').value,
    heroHeading: document.getElementById('cms-hero-heading').value,
    heroDescription: document.getElementById('cms-hero-description').value,
    primaryCtaText: document.getElementById('cms-primary-cta-text').value,
    primaryCtaLink: document.getElementById('cms-primary-cta-link').value,
    turnaroundStat: document.getElementById('cms-stat-turnaround').value,
    ownershipStat: document.getElementById('cms-stat-ownership').value,
    paymentStat: document.getElementById('cms-stat-payment').value,
  };

  try {
    const res = await apiRequest('/admin/content/homepage', {
      method: 'PUT',
      body: { data },
    });
    notify('Homepage content published live!', 'success');
  } catch (err) {
    notify(err.message, 'error');
  }
};

// ==============================================
// 7. NAVIGATION & FOOTER CMS
// ==============================================

async function loadNavAndFooterContent() {
  try {
    const navRes = await apiRequest('/admin/content/navigation');
    const container = document.getElementById('nav-items-container');
    if (navRes.success && navRes.data && navRes.data.content && container) {
      const items = navRes.data.content;
      container.innerHTML = items.map((it, idx) => `
        <div class="d-flex align-items-center gap-2 p-2 bg-dark rounded border border-secondary border-opacity-25">
          <span class="badge bg-secondary">${idx + 1}</span>
          <input type="text" class="form-control form-control-sm bg-black text-white border-secondary nav-item-label" value="${it.label}" data-idx="${idx}" />
          <input type="text" class="form-control form-control-sm bg-black text-white border-secondary nav-item-url" value="${it.url}" data-idx="${idx}" />
        </div>
      `).join('');
    }

    const footRes = await apiRequest('/admin/content/footer');
    if (footRes.success && footRes.data && footRes.data.content) {
      const f = footRes.data.content;
      document.getElementById('footer-tagline').value = f.tagline || '';
      document.getElementById('footer-description').value = f.description || '';
      document.getElementById('footer-email').value = f.email || '';
      document.getElementById('footer-address').value = f.address || '';
      document.getElementById('footer-twitter').value = f.socialLinks?.twitter || '';
      document.getElementById('footer-linkedin').value = f.socialLinks?.linkedin || '';
    }
  } catch (err) {
    console.error('Nav & Footer CMS Error:', err);
  }
}

window.saveNavigationItems = async function () {
  const labels = Array.from(document.querySelectorAll('.nav-item-label'));
  const urls = Array.from(document.querySelectorAll('.nav-item-url'));

  const items = labels.map((l, idx) => ({
    id: String(idx + 1),
    label: l.value,
    url: urls[idx].value,
    order: idx + 1,
    isEnabled: true,
  }));

  try {
    const res = await apiRequest('/admin/content/navigation', {
      method: 'PUT',
      body: { data: items },
    });
    notify('Navigation menu saved!', 'success');
  } catch (err) {
    notify(err.message, 'error');
  }
};

window.saveFooterContent = async function () {
  const data = {
    tagline: document.getElementById('footer-tagline').value,
    description: document.getElementById('footer-description').value,
    email: document.getElementById('footer-email').value,
    address: document.getElementById('footer-address').value,
    copyright: `© 2026 Pravyuk. All rights reserved. Your Vision. Our Build.`,
    socialLinks: {
      twitter: document.getElementById('footer-twitter').value,
      linkedin: document.getElementById('footer-linkedin').value,
    },
  };

  try {
    const res = await apiRequest('/admin/content/footer', {
      method: 'PUT',
      body: { data },
    });
    notify('Footer details published!', 'success');
  } catch (err) {
    notify(err.message, 'error');
  }
};

// ==============================================
// 8. SERVICES CATALOG
// ==============================================

window.loadAdminServices = async function () {
  const tbody = document.getElementById('services-table-tbody');
  try {
    const res = await apiRequest('/admin/services');
    if (res.success && res.data) {
      cachedServices = res.data.services || [];
      if (cachedServices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No services created yet.</td></tr>`;
        return;
      }
      tbody.innerHTML = cachedServices.map((s) => `
        <tr>
          <td class="fw-bold text-white">${s.name}</td>
          <td><span class="badge bg-dark border border-secondary">${s.category || 'Websites'}</span></td>
          <td class="text-success fw-bold">₹${(s.startingPrice || 0).toLocaleString('en-IN')}</td>
          <td>${s.estimatedDelivery || '3-7 days'}</td>
          <td>${s.isFeatured ? '<span class="badge bg-warning text-dark">Featured</span>' : '—'}</td>
          <td><span class="badge bg-success">${s.status}</span></td>
          <td class="text-end">
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-warning" onclick="openEditServiceModal('${s._id || s.id}')"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-outline-danger" onclick="deleteService('${s._id || s.id}')"><i class="bi bi-trash"></i></button>
            </div>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">${err.message}</td></tr>`;
  }
};

window.openCreateServiceModal = function () {
  document.getElementById('serviceModalTitle').textContent = 'Add Service Package';
  document.getElementById('service-modal-id').value = '';
  document.getElementById('svc-name').value = '';
  document.getElementById('svc-price').value = '25000';
  document.getElementById('svc-short-desc').value = '';
  document.getElementById('svc-features').value = '';
  new bootstrap.Modal(document.getElementById('serviceModal')).show();
};

window.openEditServiceModal = function (id) {
  const s = cachedServices.find((it) => (it._id || it.id) === id);
  if (!s) return;

  document.getElementById('serviceModalTitle').textContent = 'Edit Service Package';
  document.getElementById('service-modal-id').value = id;
  document.getElementById('svc-name').value = s.name;
  document.getElementById('svc-price').value = s.startingPrice;
  document.getElementById('svc-category').value = s.category || 'Websites';
  document.getElementById('svc-delivery').value = s.estimatedDelivery || '3-7 business days';
  document.getElementById('svc-short-desc').value = s.shortDescription || '';
  document.getElementById('svc-features').value = (s.features || []).join(', ');
  new bootstrap.Modal(document.getElementById('serviceModal')).show();
};

window.submitServiceForm = async function () {
  const id = document.getElementById('service-modal-id').value;
  const name = document.getElementById('svc-name').value;
  const startingPrice = document.getElementById('svc-price').value;
  const category = document.getElementById('svc-category').value;
  const estimatedDelivery = document.getElementById('svc-delivery').value;
  const shortDescription = document.getElementById('svc-short-desc').value;
  const features = document.getElementById('svc-features').value.split(',').map((f) => f.trim()).filter(Boolean);

  if (!name || !startingPrice) {
    notify('Name and price are required', 'warning');
    return;
  }

  try {
    const method = id ? 'PUT' : 'POST';
    const endpoint = id ? `/admin/services/${id}` : '/admin/services';

    const res = await apiRequest(endpoint, {
      method,
      body: { name, startingPrice, category, estimatedDelivery, shortDescription, features },
    });

    notify(res.message || 'Service saved', 'success');
    bootstrap.Modal.getInstance(document.getElementById('serviceModal'))?.hide();
    await loadAdminServices();
  } catch (err) {
    notify(err.message, 'error');
  }
};

window.deleteService = async function (id) {
  if (!confirm('Are you sure you want to delete this service?')) return;
  try {
    const res = await apiRequest(`/admin/services/${id}`, { method: 'DELETE' });
    notify(res.message || 'Service deleted', 'success');
    await loadAdminServices();
  } catch (err) {
    notify(err.message, 'error');
  }
};

// ==============================================
// 9. PORTFOLIO SHOWCASE
// ==============================================

window.loadAdminPortfolio = async function () {
  const tbody = document.getElementById('portfolio-table-tbody');
  try {
    const res = await apiRequest('/admin/portfolio');
    if (res.success && res.data) {
      cachedPortfolio = res.data.portfolio || [];
      if (cachedPortfolio.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No portfolio items added.</td></tr>`;
        return;
      }
      tbody.innerHTML = cachedPortfolio.map((p) => `
        <tr>
          <td class="fw-bold text-white">${p.title}</td>
          <td>${p.clientName || 'Pravyuk Client'}</td>
          <td><span class="badge bg-dark border border-secondary">${p.category}</span></td>
          <td class="small text-muted">${(p.techStack || []).join(', ')}</td>
          <td>${p.liveUrl ? `<a href="${p.liveUrl}" target="_blank" class="text-info">${p.liveUrl}</a>` : '—'}</td>
          <td><span class="badge bg-success">${p.status}</span></td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-danger" onclick="deletePortfolio('${p._id || p.id}')"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">${err.message}</td></tr>`;
  }
};

window.openCreatePortfolioModal = function () {
  new bootstrap.Modal(document.getElementById('portfolioModal')).show();
};

window.submitPortfolioForm = async function () {
  const title = document.getElementById('pf-title').value;
  const clientName = document.getElementById('pf-client').value;
  const category = document.getElementById('pf-category').value;
  const liveUrl = document.getElementById('pf-live-url').value;
  const techStack = document.getElementById('pf-tech-stack').value.split(',').map((t) => t.trim()).filter(Boolean);
  const description = document.getElementById('pf-description').value;

  if (!title || !description) {
    notify('Title and description are required', 'warning');
    return;
  }

  try {
    const res = await apiRequest('/admin/portfolio', {
      method: 'POST',
      body: { title, clientName, category, liveUrl, techStack, description, status: 'published' },
    });
    notify(res.message || 'Portfolio item added', 'success');
    bootstrap.Modal.getInstance(document.getElementById('portfolioModal'))?.hide();
    await loadAdminPortfolio();
  } catch (err) {
    notify(err.message, 'error');
  }
};

window.deletePortfolio = async function (id) {
  if (!confirm('Delete this portfolio project?')) return;
  try {
    const res = await apiRequest(`/admin/portfolio/${id}`, { method: 'DELETE' });
    notify(res.message || 'Portfolio project deleted', 'success');
    await loadAdminPortfolio();
  } catch (err) {
    notify(err.message, 'error');
  }
};

// ==============================================
// 10. BLOG & INSIGHTS
// ==============================================

window.loadAdminBlog = async function () {
  const tbody = document.getElementById('blog-table-tbody');
  try {
    const res = await apiRequest('/admin/blog');
    if (res.success && res.data) {
      cachedBlog = res.data.posts || [];
      if (cachedBlog.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No blog articles published.</td></tr>`;
        return;
      }
      tbody.innerHTML = cachedBlog.map((b) => `
        <tr>
          <td class="fw-bold text-white">${b.title}</td>
          <td><span class="badge bg-dark border border-secondary">${b.category}</span></td>
          <td class="small text-muted">${(b.tags || []).join(', ')}</td>
          <td><span class="badge bg-success">${b.status}</span></td>
          <td class="small text-muted">${new Date(b.createdAt).toLocaleDateString()}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-danger" onclick="deleteBlogPost('${b._id || b.id}')"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">${err.message}</td></tr>`;
  }
};

window.openCreateBlogModal = function () {
  const title = prompt('Article Title:');
  if (!title) return;
  const excerpt = prompt('Short Excerpt:');
  if (!excerpt) return;
  const content = prompt('Article Content (or Markdown):');
  if (!content) return;

  submitBlogPost(title, excerpt, content);
};

async function submitBlogPost(title, excerpt, content) {
  try {
    const res = await apiRequest('/admin/blog', {
      method: 'POST',
      body: { title, excerpt, content, status: 'published', category: 'Guides' },
    });
    notify('Article published successfully!', 'success');
    await loadAdminBlog();
  } catch (err) {
    notify(err.message, 'error');
  }
}

window.deleteBlogPost = async function (id) {
  if (!confirm('Delete this article?')) return;
  try {
    const res = await apiRequest(`/admin/blog/${id}`, { method: 'DELETE' });
    notify('Article deleted', 'success');
    await loadAdminBlog();
  } catch (err) {
    notify(err.message, 'error');
  }
};

// ==============================================
// 11. TESTIMONIALS & FAQS
// ==============================================

async function loadAdminTestimonialsAndFaqs() {
  const testTbody = document.getElementById('testimonials-table-tbody');
  const faqsTbody = document.getElementById('faqs-table-tbody');

  try {
    const tRes = await apiRequest('/admin/testimonials');
    if (tRes.success && tRes.data && testTbody) {
      const tests = tRes.data.testimonials || [];
      testTbody.innerHTML = tests.map((t) => `
        <tr>
          <td class="fw-bold text-white">${t.clientName}</td>
          <td class="text-muted small">${t.clientCompany || '—'}</td>
          <td class="text-warning">${'★'.repeat(t.rating || 5)}</td>
          <td class="text-end"><button class="btn btn-sm btn-outline-danger" onclick="deleteTestimonial('${t._id || t.id}')"><i class="bi bi-trash"></i></button></td>
        </tr>
      `).join('') || '<tr><td colspan="4" class="text-center text-muted">No testimonials</td></tr>';
    }

    const fRes = await apiRequest('/admin/faqs');
    if (fRes.success && fRes.data && faqsTbody) {
      const faqs = fRes.data.faqs || [];
      faqsTbody.innerHTML = faqs.map((f) => `
        <tr>
          <td class="fw-bold text-white">${f.question}</td>
          <td><span class="badge bg-secondary">${f.category}</span></td>
          <td class="text-end"><button class="btn btn-sm btn-outline-danger" onclick="deleteFaq('${f._id || f.id}')"><i class="bi bi-trash"></i></button></td>
        </tr>
      `).join('') || '<tr><td colspan="3" class="text-center text-muted">No FAQs</td></tr>';
    }
  } catch (err) {
    console.error('Testimonials & FAQs Load Error:', err);
  }
}

window.openCreateTestimonialModal = async function () {
  const clientName = prompt('Client Name:');
  if (!clientName) return;
  const quote = prompt('Review Quote:');
  if (!quote) return;

  try {
    const res = await apiRequest('/admin/testimonials', {
      method: 'POST',
      body: { clientName, quote, rating: 5, status: 'published' },
    });
    notify('Testimonial added', 'success');
    await loadAdminTestimonialsAndFaqs();
  } catch (err) {
    notify(err.message, 'error');
  }
};

window.deleteTestimonial = async function (id) {
  if (!confirm('Delete testimonial?')) return;
  try {
    await apiRequest(`/admin/testimonials/${id}`, { method: 'DELETE' });
    notify('Deleted', 'success');
    await loadAdminTestimonialsAndFaqs();
  } catch (err) {
    notify(err.message, 'error');
  }
};

window.openCreateFaqModal = async function () {
  const question = prompt('FAQ Question:');
  if (!question) return;
  const answer = prompt('FAQ Answer:');
  if (!answer) return;

  try {
    const res = await apiRequest('/admin/faqs', {
      method: 'POST',
      body: { question, answer, status: 'published' },
    });
    notify('FAQ item added', 'success');
    await loadAdminTestimonialsAndFaqs();
  } catch (err) {
    notify(err.message, 'error');
  }
};

window.deleteFaq = async function (id) {
  if (!confirm('Delete FAQ?')) return;
  try {
    await apiRequest(`/admin/faqs/${id}`, { method: 'DELETE' });
    notify('Deleted', 'success');
    await loadAdminTestimonialsAndFaqs();
  } catch (err) {
    notify(err.message, 'error');
  }
};

// ==============================================
// 12. MEDIA LIBRARY
// ==============================================

async function loadAdminMedia() {
  const grid = document.getElementById('media-grid');
  try {
    const res = await apiRequest('/admin/media');
    if (res.success && res.data && grid) {
      const media = res.data.media || [];
      if (media.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center py-4 text-muted">No media assets in library.</div>';
        return;
      }
      grid.innerHTML = media.map((m) => `
        <div class="col-sm-6 col-md-4 col-lg-3">
          <div class="card bg-dark border-secondary border-opacity-25 p-2 h-100">
            <div class="bg-black rounded d-flex align-items-center justify-content-center p-3 mb-2" style="height: 120px;">
              <img src="${m.url}" alt="${m.altText || m.title}" style="max-height: 100%; max-width: 100%; object-fit: contain;" onerror="this.src='../assets/images/pravyuk-icon.svg'" />
            </div>
            <div class="fw-bold text-white small text-truncate">${m.title}</div>
            <div class="d-flex justify-content-between align-items-center mt-2">
              <span class="badge bg-secondary" style="font-size: 0.65rem;">${m.category || 'Asset'}</span>
              <button class="btn btn-sm btn-link text-danger p-0" onclick="deleteMedia('${m._id || m.id}')"><i class="bi bi-trash"></i></button>
            </div>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    if (grid) grid.innerHTML = `<div class="col-12 text-danger">${err.message}</div>`;
  }
}

window.openUploadMediaModal = async function () {
  const title = prompt('Media Title: (e.g. Pravyuk Dark Brand Card)');
  if (!title) return;
  const url = prompt('Media URL or Path: (e.g. /assets/images/pravyuk-og.jpg)');
  if (!url) return;

  try {
    const res = await apiRequest('/admin/media/upload', {
      method: 'POST',
      body: { title, url, mimeType: 'image/jpeg', category: 'Brand Assets' },
    });
    notify(res.message || 'Media registered', 'success');
    await loadAdminMedia();
  } catch (err) {
    notify(err.message, 'error');
  }
};

window.deleteMedia = async function (id) {
  if (!confirm('Delete media asset?')) return;
  try {
    await apiRequest(`/admin/media/${id}`, { method: 'DELETE' });
    notify('Asset removed', 'success');
    await loadAdminMedia();
  } catch (err) {
    notify(err.message, 'error');
  }
};

// ==============================================
// 13. PAYMENTS & FINANCIALS
// ==============================================

window.loadAdminPayments = async function () {
  const tbody = document.getElementById('payments-table-tbody');
  try {
    const res = await apiRequest('/admin/payments');
    if (res.success && res.data) {
      const orders = res.data.orders || [];
      if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No transaction orders recorded yet.</td></tr>`;
        return;
      }
      tbody.innerHTML = orders.map((o) => `
        <tr>
          <td class="font-monospace text-success fw-bold">${o.orderReference}</td>
          <td>${o.customerId?.name || o.metadata?.customerEmail || 'Client'}</td>
          <td class="text-white">${o.title || o.orderType}</td>
          <td class="fw-bold text-success">₹${(o.amount || 0).toLocaleString('en-IN')}</td>
          <td><span class="badge bg-${o.paymentStatus === 'paid' ? 'success' : (o.paymentStatus === 'refunded' ? 'warning text-dark' : 'danger')}">${o.paymentStatus}</span></td>
          <td class="font-monospace small text-muted">${o.razorpayPaymentId || o.metadata?.referenceNote || 'DIRECT'}</td>
          <td class="small text-muted">${new Date(o.createdAt).toLocaleDateString()}</td>
        </tr>
      `).join('');
    }
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">${err.message}</td></tr>`;
  }
};

window.openManualPaymentModal = function () {
  new bootstrap.Modal(document.getElementById('manualPaymentModal')).show();
};

window.submitManualPayment = async function () {
  const customerEmail = document.getElementById('man-pay-email').value;
  const amount = document.getElementById('man-pay-amount').value;
  const paymentMethod = document.getElementById('man-pay-method').value;
  const referenceNote = document.getElementById('man-pay-note').value;

  if (!customerEmail || !amount) {
    notify('Customer email and amount are required', 'warning');
    return;
  }

  try {
    const res = await apiRequest('/admin/payments/record-manual', {
      method: 'POST',
      body: { customerEmail, amount: Number(amount), paymentMethod, referenceNote },
    });

    notify(res.message || 'Payment recorded', 'success');
    bootstrap.Modal.getInstance(document.getElementById('manualPaymentModal'))?.hide();
    await loadAdminPayments();
    await loadAdminSummary();
  } catch (err) {
    notify(err.message, 'error');
  }
};

window.openInitiateRefundModal = async function () {
  const orderRef = prompt('Enter Order Reference to refund (e.g. ORD-123456):');
  if (!orderRef) return;
  const amount = prompt('Refund Amount (INR):');
  if (!amount) return;
  const reason = prompt('Reason for Refund:');
  if (!reason) return;

  try {
    const res = await apiRequest('/admin/refunds/initiate', {
      method: 'POST',
      body: { orderReference: orderRef, amount: Number(amount), reason },
    });
    notify(res.message || 'Refund initiated', 'success');
    await loadAdminPayments();
    await loadAdminSummary();
  } catch (err) {
    notify(err.message, 'error');
  }
};

// ==============================================
// 14. SEO CONTROL CENTER
// ==============================================

async function loadSeoSettings() {
  try {
    const res = await apiRequest('/admin/seo');
    if (res.success && res.data && res.data.seo) {
      const s = res.data.seo;
      document.getElementById('seo-global-title').value = s.globalTitle || '';
      document.getElementById('seo-canonical-url').value = s.canonicalUrl || '';
      document.getElementById('seo-global-description').value = s.globalDescription || '';
      document.getElementById('seo-og-image').value = s.ogImage || '';
    }
  } catch (err) {
    console.error('SEO Load Error:', err);
  }
}

window.saveSeoSettings = async function () {
  const globalTitle = document.getElementById('seo-global-title').value;
  const canonicalUrl = document.getElementById('seo-canonical-url').value;
  const globalDescription = document.getElementById('seo-global-description').value;
  const ogImage = document.getElementById('seo-og-image').value;

  try {
    const res = await apiRequest('/admin/seo', {
      method: 'PUT',
      body: { globalTitle, canonicalUrl, globalDescription, ogImage },
    });
    notify(res.message || 'SEO settings saved', 'success');
  } catch (err) {
    notify(err.message, 'error');
  }
};

window.quickRegenerateSitemap = async function () {
  try {
    notify('Regenerating sitemap.xml across all published pages...', 'info');
    const res = await apiRequest('/admin/seo/regenerate-sitemap', { method: 'POST' });
    notify(`Sitemap updated! Indexed ${res.data.totalUrls} public URLs.`, 'success');
  } catch (err) {
    notify(err.message, 'error');
  }
};

// ==============================================
// 15. WEBSITE SETTINGS
// ==============================================

async function loadGlobalSettings() {
  try {
    const res = await apiRequest('/admin/settings');
    if (res.success && res.data && res.data.settings) {
      const s = res.data.settings;
      document.getElementById('settings-site-name').value = s.general?.siteName || 'Pravyuk';
      document.getElementById('settings-tagline').value = s.general?.tagline || 'Your Vision. Our Build.';
      document.getElementById('settings-support-email').value = s.contact?.supportEmail || 'support@pravyuk.com';
      document.getElementById('settings-brand-positioning').value = s.general?.brandPositioning || '';
      document.getElementById('settings-accepting-inquiries').checked = s.business?.isAcceptingInquiries !== false;
      document.getElementById('settings-pricing-visible').checked = s.business?.pricingVisible !== false;
      document.getElementById('settings-maintenance-mode').checked = Boolean(s.business?.maintenanceMode);
    }
  } catch (err) {
    console.error('Settings Load Error:', err);
  }
}

window.saveGlobalSettings = async function () {
  const payload = {
    general: {
      siteName: document.getElementById('settings-site-name').value,
      tagline: document.getElementById('settings-tagline').value,
      brandPositioning: document.getElementById('settings-brand-positioning').value,
    },
    contact: {
      supportEmail: document.getElementById('settings-support-email').value,
    },
    business: {
      isAcceptingInquiries: document.getElementById('settings-accepting-inquiries').checked,
      pricingVisible: document.getElementById('settings-pricing-visible').checked,
      maintenanceMode: document.getElementById('settings-maintenance-mode').checked,
    },
  };

  try {
    const res = await apiRequest('/admin/settings', {
      method: 'PUT',
      body: payload,
    });
    notify('Website global settings updated successfully!', 'success');
  } catch (err) {
    notify(err.message, 'error');
  }
};

// ==============================================
// 16. ADMIN USERS & ROLES (SUPER ADMIN ONLY)
// ==============================================

window.loadAdminUsers = async function () {
  const tbody = document.getElementById('admin-users-table-tbody');
  try {
    const res = await apiRequest('/admin/users');
    if (res.success && res.data) {
      const users = res.data.users || [];
      if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No staff members found.</td></tr>`;
        return;
      }
      tbody.innerHTML = users.map((u) => `
        <tr>
          <td class="fw-bold text-white">${u.name}</td>
          <td>${u.email}</td>
          <td><span class="badge bg-${u.role === 'super_admin' ? 'warning text-dark' : (u.role === 'admin' ? 'primary' : 'info')}">${u.role.toUpperCase()}</span></td>
          <td class="small text-muted">${(u.permissions || []).join(', ')}</td>
          <td><span class="badge bg-${u.status === 'active' ? 'success' : 'danger'}">${u.status}</span></td>
          <td class="text-end">
            ${u.role !== 'super_admin' ? `
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-warning" title="Toggle Status" onclick="toggleAdminUserStatus('${u.id || u._id}', '${u.status}')"><i class="bi bi-power"></i></button>
                <button class="btn btn-outline-danger" title="Delete User" onclick="deleteAdminUser('${u.id || u._id}')"><i class="bi bi-trash"></i></button>
              </div>
            ` : '<span class="text-muted small">Protected</span>'}
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">${err.message}</td></tr>`;
  }
};

window.openInviteAdminModal = function () {
  new bootstrap.Modal(document.getElementById('inviteUserModal')).show();
};

window.submitInviteUser = async function () {
  const name = document.getElementById('invite-name').value;
  const email = document.getElementById('invite-email').value;
  const password = document.getElementById('invite-password').value;
  const role = document.getElementById('invite-role').value;

  if (!name || !email || !password) {
    notify('All fields are required', 'warning');
    return;
  }

  try {
    const res = await apiRequest('/admin/users/invite', {
      method: 'POST',
      body: { name, email, password, role },
    });
    notify(res.message || 'User invited', 'success');
    bootstrap.Modal.getInstance(document.getElementById('inviteUserModal'))?.hide();
    await loadAdminUsers();
  } catch (err) {
    notify(err.message, 'error');
  }
};

window.toggleAdminUserStatus = async function (id, currentStatus) {
  const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
  try {
    const res = await apiRequest(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: { status: nextStatus },
    });
    notify(res.message || 'Status updated', 'success');
    await loadAdminUsers();
  } catch (err) {
    notify(err.message, 'error');
  }
};

window.deleteAdminUser = async function (id) {
  if (!confirm('Remove this team member from administration?')) return;
  try {
    const res = await apiRequest(`/admin/users/${id}`, { method: 'DELETE' });
    notify('User removed', 'success');
    await loadAdminUsers();
  } catch (err) {
    notify(err.message, 'error');
  }
};

// ==============================================
// 17. AUDIT LOGS & BACKUP
// ==============================================

window.loadAuditLogs = async function () {
  const tbody = document.getElementById('audit-logs-table-tbody');
  try {
    const res = await apiRequest('/admin/audit-logs');
    if (res.success && res.data) {
      const logs = res.data.logs || [];
      if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No audit trail entries recorded yet.</td></tr>`;
        return;
      }
      tbody.innerHTML = logs.map((l) => `
        <tr>
          <td class="small text-muted">${new Date(l.createdAt).toLocaleString()}</td>
          <td><strong class="text-white">${l.actorName || 'System'}</strong> <small class="text-muted d-block">${l.actorEmail || ''}</small></td>
          <td><span class="badge bg-secondary font-monospace">${l.action}</span></td>
          <td>${l.resourceType} ${l.resourceId ? `(${l.resourceId})` : ''}</td>
          <td class="font-monospace small text-muted">${l.ip || '127.0.0.1'}</td>
        </tr>
      `).join('');
    }
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">${err.message}</td></tr>`;
  }
};

window.downloadSystemBackup = async function () {
  try {
    notify('Exporting database state...', 'info');
    const res = await apiRequest('/admin/backup/export');
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `pravyuk_backup_${Date.now()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    notify('Backup downloaded successfully', 'success');
  } catch (err) {
    notify(err.message, 'error');
  }
};

// ==============================================
// 18. PROFILE & PASSWORD
// ==============================================

async function loadAdminProfile() {
  try {
    const res = await apiRequest('/admin/profile');
    if (res.success && res.data && res.data.user) {
      const u = res.data.user;
      document.getElementById('profile-name').value = u.name || '';
      document.getElementById('profile-email').value = u.email || '';
      document.getElementById('profile-phone').value = u.phone || '';
    }
  } catch (err) {
    console.error('Profile Load Error:', err);
  }
}

window.saveAdminProfile = async function () {
  const name = document.getElementById('profile-name').value;
  const phone = document.getElementById('profile-phone').value;

  try {
    const res = await apiRequest('/admin/profile', {
      method: 'PUT',
      body: { name, phone },
    });
    notify('Profile updated successfully!', 'success');
    currentUser.name = name;
    setupActorDetails();
  } catch (err) {
    notify(err.message, 'error');
  }
};

window.changeAdminPassword = async function () {
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (newPassword !== confirmPassword) {
    notify('New passwords do not match', 'warning');
    return;
  }

  try {
    const res = await apiRequest('/admin/profile/password', {
      method: 'PUT',
      body: { currentPassword, newPassword },
    });
    notify(res.message || 'Password changed successfully', 'success');
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
  } catch (err) {
    notify(err.message, 'error');
  }
};

// ==============================================
// 19. LOGOUT
// ==============================================

window.handleAdminLogout = async function () {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } catch (e) {}

  localStorage.removeItem('pravyuk_token');
  localStorage.removeItem('xevruniq_token');
  localStorage.removeItem('agenet_token');
  window.location.href = 'login.html';
};
