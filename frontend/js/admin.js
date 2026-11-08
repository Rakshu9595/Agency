document.addEventListener('DOMContentLoaded', async () => {
  // Check auth and admin permissions
  if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
    window.location.href = 'login.html?redirect=admin.html';
    return;
  }

  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!user || user.role !== 'admin') {
    const mainView = document.getElementById('admin-main-view');
    const forbiddenView = document.getElementById('admin-forbidden-view');
    if (mainView) mainView.classList.add('d-none');
    if (forbiddenView) forbiddenView.classList.remove('d-none');
    return;
  }

  // Bind quote creation form
  const createQuoteForm = document.getElementById('create-quote-form');
  if (createQuoteForm) {
    createQuoteForm.addEventListener('submit', handleCreateQuoteSubmit);
  }

  await loadAdminData();
});

let cachedAdminInquiries = [];
let cachedAdminProjects = [];

window.loadAdminData = async function () {
  await Promise.all([
    loadAdminSummary(),
    loadAdminInquiries(),
    loadAdminProjects(),
    loadAdminPayments(),
  ]);
};

async function loadAdminSummary() {
  try {
    const res = await apiRequest('/admin/summary');
    if (res.success && res.data) {
      const { metrics } = res.data;
      const revEl = document.getElementById('admin-metric-revenue');
      const inqEl = document.getElementById('admin-metric-inquiries');
      const prjEl = document.getElementById('admin-metric-projects');
      const quoEl = document.getElementById('admin-metric-quotes');

      if (revEl) revEl.textContent = typeof formatCurrency === 'function' ? formatCurrency(metrics.totalRevenue) : `₹${metrics.totalRevenue}`;
      if (inqEl) inqEl.textContent = metrics.newInquiries || 0;
      if (prjEl) prjEl.textContent = metrics.activeProjects || 0;
      if (quoEl) quoEl.textContent = metrics.pendingQuotes || 0;
    }
  } catch (err) {
    console.error('Admin summary error:', err);
  }
}

window.loadAdminInquiries = async function () {
  const tbody = document.getElementById('admin-inquiries-tbody');
  const filterStatus = document.getElementById('inquiry-filter-status')?.value || '';

  try {
    const url = filterStatus ? `/admin/inquiries?status=${filterStatus}` : '/admin/inquiries';
    const res = await apiRequest(url);

    if (res.success && res.data) {
      cachedAdminInquiries = res.data.inquiries || [];

      if (cachedAdminInquiries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No inquiries found matching criteria.</td></tr>`;
        return;
      }

      tbody.innerHTML = cachedAdminInquiries.map((inq) => {
        let statusBadge = `<span class="badge bg-secondary">${inq.status}</span>`;
        if (inq.status === 'submitted' || inq.status === 'new') statusBadge = '<span class="badge bg-primary">New</span>';
        if (inq.status === 'under_review') statusBadge = '<span class="badge bg-warning text-dark">Under Review</span>';
        if (inq.status === 'quoted') statusBadge = '<span class="badge bg-info text-dark">Quoted</span>';
        if (inq.status === 'rejected') statusBadge = '<span class="badge bg-danger">Rejected</span>';

        return `
          <tr>
            <td class="font-monospace text-primary fw-bold">${inq.referenceId}</td>
            <td>
              <strong class="text-white">${inq.name}</strong>
              ${inq.company ? `<div class="text-muted small">${inq.company}</div>` : ''}
            </td>
            <td>
              <div class="text-white">${inq.email}</div>
              <small class="text-muted">${inq.phone || 'No phone'}</small>
            </td>
            <td><span class="badge bg-dark border border-secondary">${inq.websiteType || inq.service}</span></td>
            <td class="text-white small">${inq.budgetRange || 'Flexible'}</td>
            <td>${statusBadge}</td>
            <td class="text-end">
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-light" onclick="viewInquiryBrief('${inq.referenceId}')"><i class="bi bi-eye"></i></button>
                <button class="btn btn-primary" onclick="openCreateQuoteModal('${inq.referenceId}')"><i class="bi bi-pencil-square me-1"></i> Quote</button>
                <button class="btn btn-outline-warning" onclick="updateInquiryStatusPrompt('${inq.referenceId}')"><i class="bi bi-tag"></i></button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Inquiries load error:', err);
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Failed to load inquiries.</td></tr>`;
  }
};

window.viewInquiryBrief = function (refId) {
  const inq = cachedAdminInquiries.find((i) => i.referenceId === refId);
  if (!inq) return;

  alert(`PROJECT BRIEF [${inq.referenceId}]\n\nClient: ${inq.name} (${inq.email})\nCompany: ${inq.company || 'N/A'}\nWebsite Type: ${inq.websiteType}\nTitle: ${inq.projectTitle}\n\nDescription:\n${inq.description}\n\nRequired Pages: ${inq.requiredPages || 'N/A'}\nFeatures: ${inq.requiredFeatures || 'N/A'}\nBudget: ${inq.budgetRange}\nTimeline: ${inq.timeline}`);
};

window.updateInquiryStatusPrompt = async function (refId) {
  const newStatus = prompt('Enter new status (submitted | under_review | needs_information | quoted | rejected):', 'under_review');
  if (!newStatus) return;

  try {
    const res = await apiRequest(`/admin/inquiries/${refId}/status`, {
      method: 'PATCH',
      body: { status: newStatus.trim().toLowerCase() },
    });
    if (res.success) {
      if (typeof showToast === 'function') showToast('success', `Status updated to ${newStatus}`);
      await loadAdminInquiries();
    }
  } catch (err) {
    alert(err.message || 'Error updating status');
  }
};

window.openCreateQuoteModal = function (refId) {
  const inq = cachedAdminInquiries.find((i) => i.referenceId === refId);
  if (!inq) return;

  document.getElementById('quote-inquiry-id').value = inq._id || inq.id || inq.referenceId;
  document.getElementById('quote-customer-id').value = inq.customerId || '';
  document.getElementById('quote-project-title').value = inq.projectTitle || `${inq.websiteType || 'Custom'} Website`;
  document.getElementById('quote-service').value = inq.websiteType || inq.service || 'Website Development';
  document.getElementById('quote-scope').value = `Full on-demand website build including: ${inq.requiredPages ? `Pages: ${inq.requiredPages}. ` : ''}${inq.requiredFeatures ? `Features: ${inq.requiredFeatures}. ` : ''}${inq.description || ''}`;

  const modal = new bootstrap.Modal(document.getElementById('createQuoteModal'));
  modal.show();
};

async function handleCreateQuoteSubmit(e) {
  e.preventDefault();
  const inquiryId = document.getElementById('quote-inquiry-id').value;
  const customerId = document.getElementById('quote-customer-id').value;
  const projectTitle = document.getElementById('quote-project-title').value.trim();
  const service = document.getElementById('quote-service').value.trim();
  const totalAmount = Number(document.getElementById('quote-total-amount').value);
  const advancePercentage = Number(document.getElementById('quote-advance-pct').value);
  const scopeOfWork = document.getElementById('quote-scope').value.trim();
  const includedRevisions = document.getElementById('quote-revisions').value.trim();
  const supportPeriod = document.getElementById('quote-warranty').value.trim();

  // If customerId is not on the inquiry, look up client by email
  const inq = cachedAdminInquiries.find((i) => (i._id && i._id === inquiryId) || i.referenceId === inquiryId);
  const targetCustomerId = customerId || (inq && inq.customerId) || (inq && inq.email) || 'guest_client';

  try {
    const res = await apiRequest('/admin/quotes', {
      method: 'POST',
      body: {
        inquiryId,
        customerId: targetCustomerId,
        projectTitle,
        service,
        totalAmount,
        advancePercentage,
        scopeOfWork,
        includedRevisions,
        supportPeriod,
      },
    });

    if (res.success) {
      if (typeof showToast === 'function') showToast('success', 'Quotation proposal generated and issued to client!');
      const modal = bootstrap.Modal.getInstance(document.getElementById('createQuoteModal'));
      if (modal) modal.hide();
      await loadAdminData();
    }
  } catch (err) {
    alert(err.message || 'Error creating quotation proposal');
  }
}

window.loadAdminProjects = async function () {
  const container = document.getElementById('admin-projects-list');
  try {
    const res = await apiRequest('/admin/projects');
    if (res.success && res.data) {
      cachedAdminProjects = res.data.projects || [];

      if (cachedAdminProjects.length === 0) {
        container.innerHTML = `<div class="text-center py-4 text-muted">No active development projects in the agency yet.</div>`;
        return;
      }

      container.innerHTML = cachedAdminProjects.map((p) => {
        const paid = p.paidAmount || 0;
        const total = p.totalAmount || 0;

        return `
          <div class="p-3 mb-3 rounded-3 bg-black border border-secondary border-opacity-25">
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
              <div>
                <span class="badge bg-primary font-monospace me-2">${p.projectReference}</span>
                <span class="badge bg-secondary">${p.websiteType || 'Website'}</span>
                <h5 class="text-white fw-bold mb-0 mt-2">${p.title}</h5>
                <small class="text-muted">Client: ${p.customerId?.name || 'Client'} (${p.customerId?.email || 'N/A'})</small>
              </div>
              <div class="text-end">
                <span class="badge bg-warning text-dark text-uppercase fs-6">${p.stage.replace(/_/g, ' ')}</span>
                <div class="text-muted small mt-1">Paid: ₹${paid.toLocaleString()} / ₹${total.toLocaleString()}</div>
              </div>
            </div>

            <div class="row g-2 text-muted small my-2">
              <div class="col-md-6"><strong>Staging:</strong> ${p.stagingUrl ? `<a href="${p.stagingUrl}" target="_blank" class="text-info">${p.stagingUrl}</a>` : 'Not set'}</div>
              <div class="col-md-6"><strong>Live URL:</strong> ${p.liveUrl ? `<a href="${p.liveUrl}" target="_blank" class="text-success">${p.liveUrl}</a>` : 'Not deployed'}</div>
            </div>

            <div class="d-flex flex-wrap gap-2 pt-2 border-top border-secondary border-opacity-25 mt-2">
              <button class="btn btn-sm btn-primary" onclick="openUpdateStageModal('${p.projectReference}', '${p.stage}', '${p.stagingUrl || ''}', '${p.liveUrl || ''}')">
                <i class="bi bi-arrow-right-circle me-1"></i> Update Stage & URLs
              </button>
              <button class="btn btn-sm btn-outline-info" onclick="promptAddMilestone('${p.projectReference}')">
                <i class="bi bi-plus-circle me-1"></i> Add Milestone
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Projects load error:', err);
    if (container) container.innerHTML = `<div class="text-center py-4 text-danger">Failed to load projects.</div>`;
  }
};

window.openUpdateStageModal = function (projectRef, currentStage, stagingUrl, liveUrl) {
  document.getElementById('stage-project-ref').value = projectRef;
  document.getElementById('stage-select').value = currentStage || 'development';
  document.getElementById('stage-staging-url').value = stagingUrl || '';
  document.getElementById('stage-live-url').value = liveUrl || '';
  document.getElementById('stage-note').value = '';

  const modal = new bootstrap.Modal(document.getElementById('updateStageModal'));
  modal.show();
};

window.submitProjectStageUpdate = async function () {
  const projectRef = document.getElementById('stage-project-ref').value;
  const stage = document.getElementById('stage-select').value;
  const stagingUrl = document.getElementById('stage-staging-url').value.trim();
  const liveUrl = document.getElementById('stage-live-url').value.trim();
  const note = document.getElementById('stage-note').value.trim();

  try {
    const res = await apiRequest(`/admin/projects/${projectRef}/stage`, {
      method: 'PATCH',
      body: { stage, stagingUrl, liveUrl, note },
    });

    if (res.success) {
      if (typeof showToast === 'function') showToast('success', `Project stage updated to ${stage}!`);
      const modal = bootstrap.Modal.getInstance(document.getElementById('updateStageModal'));
      if (modal) modal.hide();
      await loadAdminProjects();
    }
  } catch (err) {
    alert(err.message || 'Error updating stage');
  }
};

window.promptAddMilestone = async function (projectRef) {
  const title = prompt('Milestone Title:', 'Catalogue & Staging Approval');
  if (!title) return;
  const amountStr = prompt('Milestone Amount (INR):', '5000');
  if (!amountStr || isNaN(Number(amountStr))) return;
  const criteria = prompt('Completion Criteria:', 'Client tests catalogue filters and reviews design on staging.');

  try {
    const res = await apiRequest(`/admin/projects/${projectRef}/milestones`, {
      method: 'POST',
      body: {
        title,
        amount: Number(amountStr),
        completionCriteria: criteria || '',
      },
    });

    if (res.success) {
      if (typeof showToast === 'function') showToast('success', 'Milestone added successfully!');
      await loadAdminProjects();
    }
  } catch (err) {
    alert(err.message || 'Error adding milestone');
  }
};

window.loadAdminPayments = async function () {
  const payTbody = document.getElementById('admin-payments-tbody');
  const refTbody = document.getElementById('admin-refunds-tbody');

  try {
    const res = await apiRequest('/admin/payments');
    if (res.success && res.data) {
      const { orders, refunds } = res.data;

      if (payTbody) {
        if (!orders || orders.length === 0) {
          payTbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No orders found.</td></tr>`;
        } else {
          payTbody.innerHTML = orders.map((o) => {
            const dateStr = new Date(o.createdAt).toLocaleDateString();
            const amt = typeof formatCurrency === 'function' ? formatCurrency(o.amount) : `₹${o.amount}`;
            return `
              <tr>
                <td class="text-muted small">${dateStr}</td>
                <td class="font-monospace text-primary">${o.orderReference}</td>
                <td class="text-white">${o.customerId?.name || 'Client'}</td>
                <td class="text-muted small">${o.title}</td>
                <td class="text-white fw-bold">${amt}</td>
                <td class="font-monospace text-muted small">${o.razorpayPaymentId || '-'}</td>
                <td><span class="badge ${o.paymentStatus === 'paid' ? 'bg-success' : 'bg-secondary'}">${o.paymentStatus}</span></td>
              </tr>
            `;
          }).join('');
        }
      }

      if (refTbody) {
        if (!refunds || refunds.length === 0) {
          refTbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No refund requests logged.</td></tr>`;
        } else {
          refTbody.innerHTML = refunds.map((r) => {
            return `
              <tr>
                <td class="font-monospace text-warning">${r.refundReference}</td>
                <td class="font-monospace text-muted">${r.orderReference || 'N/A'}</td>
                <td class="text-white">${r.reason}</td>
                <td><span class="badge ${r.status === 'processed' ? 'bg-success' : 'bg-warning text-dark'}">${r.status}</span></td>
                <td class="text-end">
                  ${r.status === 'requested' ? `
                    <button class="btn btn-sm btn-success me-1" onclick="handleProcessRefundAction('${r.refundReference}', 'approve')">Approve</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="handleProcessRefundAction('${r.refundReference}', 'reject')">Reject</button>
                  ` : `<span class="text-muted small">Processed</span>`}
                </td>
              </tr>
            `;
          }).join('');
        }
      }
    }
  } catch (err) {
    console.error('Admin payments error:', err);
  }
};

window.handleProcessRefundAction = async function (refundRef, action) {
  if (!confirm(`Are you sure you want to ${action} this refund request?`)) return;

  try {
    const res = await apiRequest(`/admin/refunds/${refundRef}`, {
      method: 'PATCH',
      body: { action, auditNotes: `Staff processed action: ${action}` },
    });
    if (res.success) {
      if (typeof showToast === 'function') showToast('success', `Refund ${action}ed`);
      await loadAdminPayments();
    }
  } catch (err) {
    alert(err.message || 'Error processing refund');
  }
};
