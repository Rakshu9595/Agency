document.addEventListener('DOMContentLoaded', async () => {
  // Check auth
  if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
    const prefix = window.location.pathname.includes('/pages/') ? '' : 'pages/';
    window.location.href = `${prefix}login.html?redirect=dashboard.html`;
    return;
  }

  // Bind logout buttons
  document.querySelectorAll('.logout-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof logoutUser === 'function') logoutUser();
    });
  });

  // Bind change request submission button
  const submitChangeBtn = document.getElementById('submit-change-request-btn');
  if (submitChangeBtn) {
    submitChangeBtn.addEventListener('click', handleSubmitChangeRequest);
  }

  await loadDashboardData();
});

let cachedQuotes = [];
let cachedProjects = [];

async function loadDashboardData() {
  const greetingEl = document.getElementById('dashboard-greeting');
  const metricsSpentEl = document.getElementById('metric-total-spent');
  const metricsActiveProjectsEl = document.getElementById('metric-active-projects');
  const metricsQuotesEl = document.getElementById('metric-quotes-count');
  const metricsInquiriesEl = document.getElementById('metric-inquiries-count');

  const projectsContainer = document.getElementById('dashboard-projects-container');
  const quotesTableBody = document.getElementById('dashboard-quotes-tbody');
  const milestonesTableBody = document.getElementById('dashboard-milestones-tbody');
  const inquiriesTableBody = document.getElementById('dashboard-inquiries-tbody');
  const ordersTableBody = document.getElementById('dashboard-orders-tbody');

  try {
    const res = await apiRequest('/dashboard/summary');
    if (!res.success || !res.data) throw new Error('Failed to load dashboard data');

    const { profile, metrics, projects, milestones, quotes, recentInquiries, recentOrders } = res.data;
    cachedQuotes = quotes || [];
    cachedProjects = projects || [];

    // 1. Profile Greeting
    if (greetingEl) {
      greetingEl.textContent = `Welcome back, ${profile.name || 'Client'}`;
    }

    // 2. Metrics Cards
    if (metricsSpentEl) {
      metricsSpentEl.textContent = typeof formatCurrency === 'function' ? formatCurrency(metrics.totalSpent) : `₹${metrics.totalSpent}`;
    }
    if (metricsActiveProjectsEl) metricsActiveProjectsEl.textContent = metrics.activeProjectsCount || (projects ? projects.length : 0);
    if (metricsQuotesEl) metricsQuotesEl.textContent = metrics.quotesCount || 0;
    if (metricsInquiriesEl) metricsInquiriesEl.textContent = metrics.inquiriesCount || 0;

    // 3. Render Active Projects with Stage Progress Tracker
    renderProjects(projectsContainer, projects);

    // 4. Render Quotes & Proposals
    renderQuotes(quotesTableBody, quotes);

    // 5. Render Milestones
    renderMilestones(milestonesTableBody, milestones);

    // 6. Render Recent Inquiries
    renderInquiries(inquiriesTableBody, recentInquiries);

    // 7. Render Recent Orders & Payments
    renderOrders(ordersTableBody, recentOrders);
  } catch (err) {
    console.error('Dashboard load error:', err);
    if (typeof showToast === 'function') {
      showToast('error', 'Error loading dashboard data. Please refresh.');
    }
  }
}

// Stages definition
const ALL_STAGES = [
  { key: 'inquiry', label: 'Brief' },
  { key: 'review', label: 'Review' },
  { key: 'quotation', label: 'Quotation' },
  { key: 'awaiting_advance', label: 'Advance' },
  { key: 'design', label: 'Design' },
  { key: 'development', label: 'Code' },
  { key: 'testing', label: 'Testing' },
  { key: 'delivered', label: 'Launched' },
];

function getStageIndex(stage) {
  const idx = ALL_STAGES.findIndex((s) => s.key === stage);
  return idx >= 0 ? idx : 3;
}

function renderProjects(container, projects) {
  if (!container) return;

  if (!projects || projects.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-muted">
        <i class="bi bi-laptop fs-1 d-block mb-2 text-secondary"></i>
        <p class="mb-2">No active projects yet.</p>
        <a href="start-project.html" class="btn btn-outline-primary btn-sm">Request Your First Website</a>
      </div>
    `;
    return;
  }

  container.innerHTML = projects.map((p) => {
    const currentIdx = getStageIndex(p.stage);
    const percent = Math.round(((currentIdx + 1) / ALL_STAGES.length) * 100);

    return `
      <div class="p-3 mb-3 rounded-3 bg-black border border-secondary border-opacity-25">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <span class="badge bg-primary me-2 font-monospace">${p.projectReference}</span>
            <span class="badge bg-secondary">${p.websiteType || 'Custom Website'}</span>
            <h5 class="text-white fw-bold mt-2 mb-0">${p.title}</h5>
          </div>
          <div class="text-end">
            <span class="badge bg-info text-dark text-uppercase">${p.stage.replace(/_/g, ' ')}</span>
            <div class="text-muted small mt-1">Paid: ₹${(p.paidAmount || 0).toLocaleString()} / ₹${(p.totalAmount || 0).toLocaleString()}</div>
          </div>
        </div>

        <!-- Stage Stepper Tracker -->
        <div class="progress mb-3" style="height: 6px; background: rgba(255,255,255,0.1);">
          <div class="progress-bar bg-primary" role="progressbar" style="width: ${percent}%;"></div>
        </div>
        <div class="d-flex justify-content-between text-muted small mb-3 flex-wrap gap-1">
          ${ALL_STAGES.map((s, idx) => {
            const isDone = idx <= currentIdx;
            const isCurrent = idx === currentIdx;
            return `<span class="${isCurrent ? 'text-primary fw-bold' : (isDone ? 'text-white' : 'opacity-50')}"><i class="bi ${isDone ? 'bi-check2' : 'bi-circle'} me-1"></i>${s.label}</span>`;
          }).join('')}
        </div>

        <!-- Links and Actions -->
        <div class="d-flex flex-wrap gap-2 pt-2 border-top border-secondary border-opacity-25 align-items-center">
          ${p.stagingUrl ? `<a href="${p.stagingUrl}" target="_blank" class="btn btn-sm btn-outline-info"><i class="bi bi-box-arrow-up-right me-1"></i> Open Staging Preview</a>` : ''}
          ${p.liveUrl ? `<a href="${p.liveUrl}" target="_blank" class="btn btn-sm btn-success"><i class="bi bi-globe me-1"></i> View Live Website</a>` : ''}
          ${p.stage === 'awaiting_advance' ? `<button class="btn btn-sm btn-warning" onclick="handlePayAdvance('${p.quoteId}')"><i class="bi bi-credit-card me-1"></i> Pay Advance Deposit (₹${(p.advanceAmount || 0).toLocaleString()})</button>` : ''}
          <span class="text-muted small ms-auto">Timeline: ${p.timeline || '3-4 weeks'}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderQuotes(tbody, quotes) {
  if (!tbody) return;

  if (!quotes || quotes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No quotation proposals received yet. <a href="start-project.html" class="text-primary">Request a quote</a></td></tr>`;
    return;
  }

  tbody.innerHTML = quotes.map((q) => {
    const total = typeof formatCurrency === 'function' ? formatCurrency(q.totalAmount) : `₹${q.totalAmount}`;
    const advance = typeof formatCurrency === 'function' ? formatCurrency(q.advanceAmount) : `₹${q.advanceAmount}`;

    let statusBadge = `<span class="badge bg-secondary">${q.status}</span>`;
    if (q.status === 'sent') statusBadge = '<span class="badge bg-info text-dark">Awaiting Review</span>';
    if (q.status === 'approved') statusBadge = q.advancePaid ? '<span class="badge bg-success">Advance Paid</span>' : '<span class="badge bg-primary">Approved (Pay Advance)</span>';
    if (q.status === 'changes_requested') statusBadge = '<span class="badge bg-warning text-dark">Revisions Requested</span>';
    if (q.status === 'rejected') statusBadge = '<span class="badge bg-danger">Rejected</span>';

    return `
      <tr>
        <td class="font-monospace text-primary fw-bold">${q.quoteReference}</td>
        <td>
          <div class="text-white fw-bold">${q.projectTitle}</div>
          <small class="text-muted">${q.service}</small>
        </td>
        <td class="text-white">${total}</td>
        <td class="text-primary fw-bold">${advance}</td>
        <td>${statusBadge}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-light me-1" onclick="viewProposalDetails('${q.quoteReference}')">
            <i class="bi bi-eye me-1"></i> View Proposal
          </button>
          ${q.status === 'approved' && !q.advancePaid ? `
            <button class="btn btn-sm btn-success" onclick="handlePayAdvanceDirect('${q.quoteReference}')">
              <i class="bi bi-credit-card me-1"></i> Pay Advance
            </button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

function renderMilestones(tbody, milestones) {
  if (!tbody) return;

  if (!milestones || milestones.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No milestone payments scheduled yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = milestones.map((m) => {
    const amt = typeof formatCurrency === 'function' ? formatCurrency(m.amount) : `₹${m.amount}`;
    let payBadge = `<span class="badge bg-secondary">${m.paymentState}</span>`;
    if (m.paymentState === 'payable') payBadge = '<span class="badge bg-warning text-dark">Payable Now</span>';
    if (m.paymentState === 'paid') payBadge = '<span class="badge bg-success">Paid</span>';

    return `
      <tr>
        <td class="font-monospace text-muted small">${m.milestoneReference || 'MLS-N/A'}</td>
        <td>
          <strong class="text-white">${m.title}</strong>
          <div class="text-muted small">${m.completionCriteria || 'Milestone verification'}</div>
        </td>
        <td class="text-white fw-bold">${amt}</td>
        <td><span class="badge bg-dark border border-secondary">${m.approvalState}</span></td>
        <td>${payBadge}</td>
        <td class="text-end">
          ${m.paymentState === 'payable' ? `
            <button class="btn btn-sm btn-warning" onclick="handlePayMilestone('${m.milestoneReference}', ${m.amount})">
              <i class="bi bi-wallet2 me-1"></i> Pay Milestone
            </button>
          ` : (m.paymentState === 'paid' ? '<span class="text-success small"><i class="bi bi-check-circle me-1"></i>Completed</span>' : '<span class="text-muted small">Locked</span>')}
        </td>
      </tr>
    `;
  }).join('');
}

function renderInquiries(tbody, inquiries) {
  if (!tbody) return;

  if (!inquiries || inquiries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No inquiries submitted yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = inquiries.map((inq) => {
    const dateStr = new Date(inq.createdAt).toLocaleDateString();
    let badge = `<span class="badge bg-secondary">${inq.status}</span>`;
    if (inq.status === 'submitted' || inq.status === 'new') badge = '<span class="badge bg-primary">Submitted</span>';
    if (inq.status === 'under_review') badge = '<span class="badge bg-warning text-dark">Under Review</span>';
    if (inq.status === 'quoted') badge = '<span class="badge bg-info text-dark">Quote Ready</span>';

    return `
      <tr>
        <td class="text-muted small">${dateStr}</td>
        <td class="font-monospace text-primary">${inq.referenceId}</td>
        <td class="text-white">${inq.projectTitle}</td>
        <td class="text-muted">${inq.websiteType || inq.service}</td>
        <td>${badge}</td>
      </tr>
    `;
  }).join('');
}

function renderOrders(tbody, orders) {
  if (!tbody) return;

  if (!orders || orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No verified transactions yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map((o) => {
    const dateStr = new Date(o.createdAt).toLocaleDateString();
    const amt = typeof formatCurrency === 'function' ? formatCurrency(o.amount) : `₹${o.amount}`;
    let badge = `<span class="badge bg-secondary">${o.paymentStatus}</span>`;
    if (o.paymentStatus === 'paid') badge = '<span class="badge bg-success">Paid</span>';
    if (o.paymentStatus === 'failed') badge = '<span class="badge bg-danger">Failed</span>';

    return `
      <tr>
        <td class="text-muted small">${dateStr}</td>
        <td class="font-monospace text-primary">${o.orderReference}</td>
        <td class="text-white">${o.title}</td>
        <td class="text-white fw-bold">${amt}</td>
        <td>${badge}</td>
        <td class="text-end">
          ${o.paymentStatus === 'paid' ? `
            <a href="billing.html" class="btn btn-sm btn-outline-info"><i class="bi bi-file-earmark-pdf me-1"></i> Receipt</a>
          ` : '-'}
        </td>
      </tr>
    `;
  }).join('');
}

// Global modal triggers
window.viewProposalDetails = function (quoteRef) {
  const quote = cachedQuotes.find((q) => q.quoteReference === quoteRef);
  if (!quote) return;

  const modalEl = document.getElementById('proposalModal');
  const titleEl = document.getElementById('proposalModalTitle');
  const bodyEl = document.getElementById('proposalModalBody');
  const footerEl = document.getElementById('proposalModalFooter');

  titleEl.innerHTML = `<span class="text-primary font-monospace">${quote.quoteReference}</span> — ${quote.projectTitle}`;

  const total = typeof formatCurrency === 'function' ? formatCurrency(quote.totalAmount) : `₹${quote.totalAmount}`;
  const advance = typeof formatCurrency === 'function' ? formatCurrency(quote.advanceAmount) : `₹${quote.advanceAmount}`;

  bodyEl.innerHTML = `
    <div class="mb-3">
      <h6 class="text-primary fw-bold mb-1">Scope of Work</h6>
      <p class="text-muted">${quote.scopeOfWork || quote.projectTitle}</p>
    </div>
    <div class="row g-3 mb-3">
      <div class="col-sm-6">
        <div class="p-3 bg-black rounded border border-secondary border-opacity-25">
          <span class="text-muted small">Total Project Price</span>
          <h4 class="text-white fw-bold mb-0">${total}</h4>
        </div>
      </div>
      <div class="col-sm-6">
        <div class="p-3 bg-black rounded border border-primary border-opacity-50">
          <span class="text-muted small">Required Kickoff Advance</span>
          <h4 class="text-primary fw-bold mb-0">${advance}</h4>
        </div>
      </div>
    </div>

    ${Array.isArray(quote.milestones) && quote.milestones.length > 0 ? `
      <div class="mb-3">
        <h6 class="text-primary fw-bold mb-2">Milestone Schedule</h6>
        <ul class="list-group list-group-flush bg-transparent">
          ${quote.milestones.map((m) => `
            <li class="list-group-item bg-black text-white border-secondary border-opacity-25 d-flex justify-content-between align-items-center">
              <div>
                <strong>${m.title}</strong>
                <div class="text-muted small">${m.percentage || 0}% of project scope</div>
              </div>
              <span class="badge bg-secondary font-monospace">₹${(m.amount || 0).toLocaleString()}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    ` : ''}

    <div class="row g-2 text-muted small mb-2">
      <div class="col-sm-6"><strong>Revisions:</strong> ${quote.includedRevisions || '2 rounds'}</div>
      <div class="col-sm-6"><strong>Warranty:</strong> ${quote.supportPeriod || '30 days warranty'}</div>
    </div>
  `;

  if (quote.status === 'sent') {
    footerEl.innerHTML = `
      <button type="button" class="btn btn-outline-danger btn-sm" onclick="rejectProposal('${quote.quoteReference}')">Reject</button>
      <button type="button" class="btn btn-outline-warning btn-sm" onclick="openChangeRequestModal('${quote.quoteReference}')">Request Changes</button>
      <button type="button" class="btn btn-primary" onclick="approveAndPayAdvance('${quote.quoteReference}')">
        <i class="bi bi-check2-circle me-1"></i> Accept Proposal & Pay Advance
      </button>
    `;
  } else if (quote.status === 'approved' && !quote.advancePaid) {
    footerEl.innerHTML = `
      <button type="button" class="btn btn-success" onclick="handlePayAdvanceDirect('${quote.quoteReference}')">
        <i class="bi bi-credit-card me-1"></i> Pay Advance Deposit (${advance})
      </button>
    `;
  } else {
    footerEl.innerHTML = `<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>`;
  }

  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();
};

window.approveAndPayAdvance = async function (quoteRef) {
  try {
    const res = await apiRequest(`/quotes/${quoteRef}/accept`, { method: 'POST' });
    if (res.success) {
      if (typeof showToast === 'function') showToast('success', 'Proposal approved! Launching Razorpay checkout...');
      // Dismiss modal
      const modalEl = document.getElementById('proposalModal');
      const bsModal = bootstrap.Modal.getInstance(modalEl);
      if (bsModal) bsModal.hide();

      // Launch advance checkout
      window.handlePayAdvanceDirect(quoteRef);
    }
  } catch (err) {
    alert(err.message || 'Error accepting proposal');
  }
};

window.openChangeRequestModal = function (quoteRef) {
  const modalEl = document.getElementById('proposalModal');
  const bsModal = bootstrap.Modal.getInstance(modalEl);
  if (bsModal) bsModal.hide();

  document.getElementById('change-quote-ref').value = quoteRef;
  const changeModal = new bootstrap.Modal(document.getElementById('requestChangeModal'));
  changeModal.show();
};

async function handleSubmitChangeRequest() {
  const quoteRef = document.getElementById('change-quote-ref').value;
  const feedback = document.getElementById('change-feedback-input').value.trim();

  if (!feedback) {
    alert('Please enter your revision feedback.');
    return;
  }

  try {
    const res = await apiRequest(`/quotes/${quoteRef}/request-changes`, {
      method: 'POST',
      body: { feedback },
    });

    if (res.success) {
      if (typeof showToast === 'function') showToast('success', 'Revision requested. Agency lead will update your proposal.');
      const modal = bootstrap.Modal.getInstance(document.getElementById('requestChangeModal'));
      if (modal) modal.hide();
      await loadDashboardData();
    }
  } catch (err) {
    alert(err.message || 'Error submitting change request');
  }
}

window.rejectProposal = async function (quoteRef) {
  if (!confirm('Are you sure you want to decline this quotation proposal?')) return;
  try {
    const res = await apiRequest(`/quotes/${quoteRef}/reject`, { method: 'POST', body: { reason: 'Client declined proposal' } });
    if (res.success) {
      if (typeof showToast === 'function') showToast('info', 'Quotation marked rejected.');
      const modalEl = document.getElementById('proposalModal');
      const bsModal = bootstrap.Modal.getInstance(modalEl);
      if (bsModal) bsModal.hide();
      await loadDashboardData();
    }
  } catch (err) {
    alert(err.message || 'Error rejecting proposal');
  }
};

window.handlePayAdvanceDirect = function (quoteRef) {
  if (typeof initiateServiceCheckout === 'function') {
    initiateServiceCheckout({
      orderType: 'project_advance',
      quoteReference: quoteRef,
    });
  } else {
    alert('Checkout service unavailable. Please refresh.');
  }
};

window.handlePayMilestone = function (milestoneRef, amount) {
  if (typeof initiateServiceCheckout === 'function') {
    initiateServiceCheckout({
      orderType: 'project_milestone',
      milestoneId: milestoneRef,
    });
  } else {
    alert('Checkout service unavailable. Please refresh.');
  }
};
