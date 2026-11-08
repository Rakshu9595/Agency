document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const orderReference = urlParams.get('orderReference');
  const reason = urlParams.get('reason');

  const statusNote = document.querySelector('.status-note');
  const detailsContainer = document.getElementById('payment-status-details');
  const retryBtn = document.getElementById('retry-payment-btn');

  if (statusNote) {
    statusNote.setAttribute('role', 'status');
  }

  // 1. If on payment failure page, display the failure reason safely
  if (window.location.pathname.includes('payment-failure')) {
    if (detailsContainer) {
      detailsContainer.innerHTML = `
        <div class="p-3 rounded mb-3" style="background: rgba(18, 37, 61, 0.6);">
          <div class="d-flex justify-content-between mb-2">
            <span class="text-muted">Order Reference:</span>
            <code>${orderReference || 'N/A'}</code>
          </div>
          <div class="d-flex justify-content-between">
            <span class="text-muted">Failure Reason:</span>
            <span class="text-danger fw-semibold">${reason ? decodeURIComponent(reason) : 'Payment was declined or cancelled.'}</span>
          </div>
        </div>
      `;
    }

    if (retryBtn && orderReference) {
      retryBtn.addEventListener('click', () => {
        window.location.href = `billing.html`;
      });
    }
    return;
  }

  // 2. If on payment success page, verify authoritative status with backend!
  if (window.location.pathname.includes('payment-success')) {
    if (!orderReference) {
      if (detailsContainer) {
        detailsContainer.innerHTML = `
          <div class="alert alert-warning">
            No order reference provided in callback. Please inspect your <a href="billing.html" class="alert-link">Billing Dashboard</a>.
          </div>
        `;
      }
      return;
    }

    if (detailsContainer) {
      detailsContainer.innerHTML = `
        <div class="text-center py-3 text-muted">
          <span class="spinner-border spinner-border-sm me-2"></span>
          Verifying payment confirmation with server...
        </div>
      `;
    }

    try {
      // Authoritative verification check from backend endpoint
      const res = await apiRequest(`/payments/${orderReference}`);
      if (!res.success || !res.data || !res.data.order) {
        throw new Error('Unable to retrieve authoritative order verification from backend.');
      }

      const order = res.data.order;
      const payment = res.data.payment;

      if (order.paymentStatus === 'paid') {
        const amountStr = typeof formatCurrency === 'function' ? formatCurrency(order.amount) : `₹${order.amount}`;

        if (detailsContainer) {
          detailsContainer.innerHTML = `
            <div class="p-4 rounded mb-4" style="background: rgba(18, 37, 61, 0.8); border: 1px solid rgba(56, 211, 159, 0.25);">
              <div class="d-flex align-items-center gap-2 mb-3 text-success">
                <i class="bi bi-shield-check fs-4"></i>
                <h5 class="mb-0 fw-bold">Authoritative Payment Confirmed</h5>
              </div>
              <div class="row g-2 text-start">
                <div class="col-sm-6 text-muted">Order Reference:</div>
                <div class="col-sm-6 text-sm-end"><code>${order.orderReference}</code></div>
                <div class="col-sm-6 text-muted">Service / Plan:</div>
                <div class="col-sm-6 text-sm-end text-white fw-semibold">${order.title}</div>
                <div class="col-sm-6 text-muted">Amount Paid:</div>
                <div class="col-sm-6 text-sm-end fs-5 fw-bold text-primary">${amountStr}</div>
                <div class="col-sm-6 text-muted">Razorpay Payment ID:</div>
                <div class="col-sm-6 text-sm-end"><code>${order.razorpayPaymentId || payment?.razorpayPaymentId || 'Verified'}</code></div>
                <div class="col-sm-6 text-muted">Receipt Number:</div>
                <div class="col-sm-6 text-sm-end text-muted">${order.receiptNumber || 'N/A'}</div>
              </div>
            </div>
            <div class="d-flex flex-wrap gap-2 justify-content-center">
              <a href="dashboard.html" class="btn btn-primary"><i class="bi bi-speedometer2 me-1"></i> Go to Dashboard</a>
              <a href="billing.html" class="btn btn-outline-light"><i class="bi bi-receipt me-1"></i> View All Invoices</a>
            </div>
          `;
        }
      } else {
        // Status is still pending or failed
        if (detailsContainer) {
          detailsContainer.innerHTML = `
            <div class="alert alert-warning">
              <h5><i class="bi bi-hourglass-split me-2"></i>Payment Verification Pending</h5>
              <p class="mb-2">Your payment is being reconciled with Razorpay webhooks. Current status: <strong>${order.paymentStatus}</strong>.</p>
              <a href="billing.html" class="btn btn-sm btn-outline-dark">Check Billing History</a>
            </div>
          `;
        }
      }
    } catch (err) {
      if (detailsContainer) {
        detailsContainer.innerHTML = `
          <div class="alert alert-danger">
            <h6 class="fw-bold"><i class="bi bi-exclamation-triangle me-2"></i>Verification Check Failed</h6>
            <p class="mb-0 small">${err.message}</p>
          </div>
        `;
      }
    }
  }
});
