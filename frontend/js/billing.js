document.addEventListener('DOMContentLoaded', async () => {
  const billingTableBody = document.getElementById('billing-history-tbody');
  const emptyState = document.getElementById('billing-empty-state');

  if (!isLoggedIn()) {
    const prefix = window.location.pathname.includes('/pages/') ? '' : 'pages/';
    window.location.href = `${prefix}login.html?redirect=billing.html`;
    return;
  }

  loadBillingHistory(billingTableBody, emptyState);
});

async function loadBillingHistory(tbody, emptyEl) {
  if (!tbody) return;

  try {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading payment records...</td></tr>`;

    const res = await apiRequest('/payments/history?limit=20');
    if (!res.success || !res.data || !res.data.orders || res.data.orders.length === 0) {
      tbody.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('d-none');
      return;
    }

    if (emptyEl) emptyEl.classList.add('d-none');

    const orders = res.data.orders;
    tbody.innerHTML = orders
      .map((ord) => {
        const dateStr = new Date(ord.createdAt).toLocaleDateString();
        const priceStr = typeof formatCurrency === 'function' ? formatCurrency(ord.amount) : `₹${ord.amount}`;

        const statusBadge = {
          paid: '<span class="badge bg-success bg-opacity-25 text-success border border-success border-opacity-25"><i class="bi bi-check-circle me-1"></i>Paid</span>',
          pending: '<span class="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-25"><i class="bi bi-hourglass-split me-1"></i>Pending</span>',
          failed: '<span class="badge bg-danger bg-opacity-25 text-danger border border-danger border-opacity-25"><i class="bi bi-x-circle me-1"></i>Failed</span>',
          refunded: '<span class="badge bg-info bg-opacity-25 text-info border border-info border-opacity-25"><i class="bi bi-arrow-counterclockwise me-1"></i>Refunded</span>',
        }[ord.paymentStatus] || `<span class="badge bg-secondary">${ord.paymentStatus}</span>`;

        const canRefund = ord.paymentStatus === 'paid';
        const hasReceipt = ord.paymentStatus === 'paid';

        return `
          <tr>
            <td class="text-muted small">${dateStr}</td>
            <td><code>${ord.orderReference}</code></td>
            <td class="text-white">${ord.title || 'Agency Service'}</td>
            <td class="fw-bold text-primary">${priceStr}</td>
            <td>${statusBadge}</td>
            <td class="text-end">
              <div class="btn-group btn-group-sm">
                ${
                  hasReceipt
                    ? `<button class="btn btn-outline-light btn-view-receipt" data-order-ref="${ord.orderReference}"><i class="bi bi-receipt me-1"></i>Receipt</button>`
                    : ''
                }
                ${
                  canRefund
                    ? `<button class="btn btn-outline-secondary btn-request-refund" data-order-ref="${ord.orderReference}"><i class="bi bi-arrow-return-left"></i></button>`
                    : ''
                }
                ${
                  ord.paymentStatus === 'pending'
                    ? `<button class="btn btn-primary btn-sm btn-retry-order" data-order-ref="${ord.orderReference}">Pay Now</button>`
                    : ''
                }
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    // Attach receipt buttons
    tbody.querySelectorAll('.btn-view-receipt').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const ref = e.currentTarget.dataset.orderRef;
        openReceiptModal(ref);
      });
    });

    // Attach refund buttons
    tbody.querySelectorAll('.btn-request-refund').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const ref = e.currentTarget.dataset.orderRef;
        openRefundModal(ref);
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">${err.message || 'Error loading billing history.'}</td></tr>`;
  }
}

async function openReceiptModal(orderReference) {
  let modalEl = document.getElementById('receipt-modal');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'receipt-modal';
    document.body.appendChild(modalEl);
  }

  try {
    const res = await apiRequest(`/payments/${orderReference}/receipt`);
    if (!res.success || !res.data) throw new Error('Receipt not available');
    const r = res.data.receipt;

    const amountStr = typeof formatCurrency === 'function' ? formatCurrency(r.amount) : `₹${r.amount}`;
    const dateStr = new Date(r.paidAt || Date.now()).toLocaleString();

    modalEl.innerHTML = `
      <div class="modal fade show d-block" tabindex="-1" style="background: rgba(23, 23, 23, 0.7); backdrop-filter: blur(8px); z-index: 9999;">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content border-0 shadow-lg" style="background: #FFFFFF; color: #171717; border-radius: 16px; border: 1px solid #E6E1D8;">
            <div class="modal-header border-bottom border-light-subtle pb-3">
              <h5 class="modal-title fw-bold text-dark"><i class="bi bi-receipt me-2 text-primary"></i>Official Transaction Receipt</h5>
              <button type="button" class="btn-close" id="close-receipt-modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-4" id="printable-receipt-area">
              <div class="d-flex justify-content-between align-items-start border-bottom border-light-subtle pb-4 mb-4">
                <div>
                  <h3 class="fw-bold mb-1" style="font-family: var(--font-serif); color: #171717;">Pravyuk</h3>
                  <p class="text-muted small mb-0">Your Vision. Our Build. | Website Development Agency</p>
                  <p class="text-muted small mb-0">Support: ${r.agency?.supportEmail || 'hello@pravyuk.com'}</p>
                </div>
                <div class="text-end">
                  <span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-2 mb-2">PAID IN FULL</span>
                  <div class="text-muted small">Receipt No: <strong>${r.receiptNumber}</strong></div>
                  <div class="text-muted small">Date: ${dateStr}</div>
                </div>
              </div>

              <div class="row g-3 mb-4">
                <div class="col-sm-6">
                  <span class="text-muted small d-block">Billed To:</span>
                  <strong class="text-dark">${r.customer.name}</strong>
                  <div class="text-muted small">${r.customer.email}</div>
                </div>
                <div class="col-sm-6 text-sm-end">
                  <span class="text-muted small d-block">Payment Method:</span>
                  <strong class="text-dark">${r.paymentMethod}</strong>
                  <div class="text-muted small">Order ID: <code>${r.razorpayOrderId}</code></div>
                  <div class="text-muted small">Payment ID: <code>${r.razorpayPaymentId}</code></div>
                </div>
              </div>

              <table class="table table-bordered rounded mb-4" style="background: #FAF9F6; border-color: #E6E1D8;">
                <thead>
                  <tr class="text-muted small border-bottom">
                    <th>Description</th>
                    <th class="text-end">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="text-dark">
                      <strong>${r.title}</strong>
                      <div class="text-muted small">${r.description || 'Professional website development service'}</div>
                    </td>
                    <td class="text-end fs-5 fw-bold text-dark">${amountStr}</td>
                  </tr>
                </tbody>
              </table>

              <div class="d-flex justify-content-between align-items-center text-muted small border-top border-light-subtle pt-3">
                <span>Subject to Pravyuk Terms of Service and signed deliverables scope.</span>
                <span>Currency: ${r.currency}</span>
              </div>
            </div>
            <div class="modal-footer border-top border-light-subtle">
              <button class="btn btn-outline-dark btn-sm" onclick="window.print()"><i class="bi bi-printer me-1"></i> Print / Save PDF</button>
              <button class="btn btn-secondary btn-sm" id="btn-close-receipt">Close</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const closeHandler = () => { modalEl.innerHTML = ''; };
    document.getElementById('close-receipt-modal')?.addEventListener('click', closeHandler);
    document.getElementById('btn-close-receipt')?.addEventListener('click', closeHandler);
  } catch (err) {
    alert(err.message || 'Failed to load receipt.');
  }
}

function openRefundModal(orderReference) {
  let modalEl = document.getElementById('refund-modal');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'refund-modal';
    document.body.appendChild(modalEl);
  }

  modalEl.innerHTML = `
    <div class="modal fade show d-block" tabindex="-1" style="background: rgba(7, 17, 31, 0.85); backdrop-filter: blur(8px); z-index: 9999;">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg" style="background: #0f1f35; color: #edf4ff; border-radius: 16px;">
          <div class="modal-header border-bottom border-secondary border-opacity-25 pb-3">
            <h5 class="modal-title fw-bold text-white"><i class="bi bi-arrow-counterclockwise me-2 text-warning"></i>Request a Refund</h5>
            <button type="button" class="btn-close btn-close-white" id="close-refund-modal" aria-label="Close"></button>
          </div>
          <form id="refund-request-form">
            <div class="modal-body py-4">
              <p class="text-muted small mb-3">
                Refunds are governed by our <a href="refund-policy.html" target="_blank" class="text-primary">Refund Policy</a>. Retainers and milestones already accepted are subject to policy criteria.
              </p>
              <div class="mb-3">
                <label class="form-label small text-muted">Order Reference</label>
                <input class="form-control bg-dark border-secondary text-white" value="${orderReference}" readonly />
              </div>
              <div class="mb-3">
                <label class="form-label small text-muted">Reason for Refund Request</label>
                <textarea id="refund-reason" class="form-control bg-dark border-secondary text-white" rows="3" placeholder="Please describe why you are requesting a refund..." required></textarea>
              </div>
              <div class="form-status" aria-live="polite"></div>
            </div>
            <div class="modal-footer border-top border-secondary border-opacity-25">
              <button type="button" class="btn btn-outline-secondary btn-sm" id="btn-cancel-refund">Cancel</button>
              <button type="submit" class="btn btn-warning btn-sm">Submit Request</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  const cleanup = () => { modalEl.innerHTML = ''; };
  document.getElementById('close-refund-modal')?.addEventListener('click', cleanup);
  document.getElementById('btn-cancel-refund')?.addEventListener('click', cleanup);

  document.getElementById('refund-request-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const reason = document.getElementById('refund-reason')?.value;
    const statusEl = modalEl.querySelector('.form-status');

    try {
      const res = await apiRequest(`/payments/${orderReference}/refund-requests`, {
        method: 'POST',
        body: { reason },
      });

      if (res.success) {
        showStatus(statusEl, 'Refund request submitted for review.', 'success');
        setTimeout(() => {
          cleanup();
          window.location.reload();
        }, 1200);
      }
    } catch (err) {
      showStatus(statusEl, err.message || 'Failed to submit refund request.', 'danger');
    }
  });
}
