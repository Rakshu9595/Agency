/**
 * Agency Web Razorpay Checkout Module
 * Handles order creation, Razorpay modal instantiation, signature verification, and sandbox fallback.
 */

export const CheckoutService = {
  async ensureRazorpayLoaded() {
    if (window.Razorpay) return true;
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => {
        console.warn('[Checkout] External Razorpay script failed to load. Will use sandbox simulation.');
        resolve(false);
      };
      document.head.appendChild(script);
    });
  },

  /**
   * Main checkout entrypoint.
   * 
   * @param {Object} orderPayload 
   * @param {string} orderPayload.orderType - 'service_package' | 'project_advance' | 'project_milestone' | 'membership_subscription'
   * @param {string} [orderPayload.serviceSlug]
   * @param {string} [orderPayload.packageId]
   * @param {string} [orderPayload.quoteReference]
   * @param {string} [orderPayload.milestoneId]
   * @param {string} [orderPayload.membershipPlanId]
   */
  async initiateCheckout(orderPayload) {
    // 1. Verify authentication
    if (!isLoggedIn()) {
      const currentUrl = window.location.pathname.split('/').pop() || 'index.html';
      const redirectPrefix = window.location.pathname.includes('/pages/') ? '' : 'pages/';
      window.location.href = `${redirectPrefix}login.html?redirect=${encodeURIComponent(currentUrl)}`;
      return;
    }

    // 2. Call backend to create authoritative server-side order
    let orderData = null;
    try {
      if (typeof NotificationService !== 'undefined') {
        NotificationService.info('Preparing secure checkout order...', 2500);
      }

      const res = await apiRequest('/payments/orders', {
        method: 'POST',
        body: orderPayload,
      });

      if (!res.success || !res.data) {
        throw new Error(res.message || 'Failed to initialize payment order.');
      }
      orderData = res.data;
    } catch (err) {
      if (typeof NotificationService !== 'undefined') {
        NotificationService.error(err.message || 'Checkout failed to start.');
      } else {
        alert(err.message || 'Checkout failed to start.');
      }
      return;
    }

    const {
      orderReference,
      razorpayOrderId,
      amount,
      amountInPaise,
      currency,
      keyId,
      title,
      description,
      customer,
    } = orderData;

    // 3. Check if Razorpay SDK is available and if key is real test/live key
    const hasSDK = await this.ensureRazorpayLoaded();
    const isLiveKey = keyId && !keyId.includes('placeholder') && !keyId.includes('YOUR_');

    if (hasSDK && isLiveKey && window.Razorpay) {
      // Real Razorpay Checkout flow
      const options = {
        key: keyId,
        amount: amountInPaise,
        currency: currency || 'INR',
        name: 'Pravyuk',
        description: title || 'Website Development Service Payment',
        order_id: razorpayOrderId,
        handler: async (response) => {
          await this.verifyAndRedirect({
            orderReference,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
        },
        prefill: {
          name: customer?.name || '',
          email: customer?.email || '',
        },
        theme: {
          color: '#171717',
        },
        modal: {
          ondismiss: () => {
            if (typeof NotificationService !== 'undefined') {
              NotificationService.warning('Payment window closed without completing transaction.');
            }
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (failRes) => {
        const reason = failRes?.error?.description || 'Payment rejected by bank or card issuer';
        const prefix = window.location.pathname.includes('/pages/') ? '' : 'pages/';
        window.location.href = `${prefix}payment-failure.html?orderReference=${orderReference}&reason=${encodeURIComponent(reason)}`;
      });
      rzp.open();
    } else {
      // Interactive Sandbox Simulation Modal
      this.openSandboxModal({
        orderReference,
        razorpayOrderId,
        amount,
        currency,
        title,
        customer,
      });
    }
  },

  /**
   * Verify signature with backend and redirect to success.
   */
  async verifyAndRedirect({ orderReference, razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    try {
      if (typeof NotificationService !== 'undefined') {
        NotificationService.info('Verifying transaction signature with backend...', 3000);
      }

      const verifyRes = await apiRequest('/payments/verify', {
        method: 'POST',
        body: {
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: razorpaySignature,
        },
      });

      if (verifyRes.success) {
        if (typeof window !== 'undefined') {
          const tracker = window.pravyukAnalytics || window.xevruniqAnalytics;
          if (tracker) {
            tracker.trackPaymentCompleted(orderReference, verifyRes.data?.order?.amountInr);
          }
        }
        const prefix = window.location.pathname.includes('/pages/') ? '' : 'pages/';
        window.location.href = `${prefix}payment-success.html?orderReference=${orderReference}`;
      } else {
        throw new Error(verifyRes.message || 'Signature verification failed');
      }
    } catch (err) {
      const prefix = window.location.pathname.includes('/pages/') ? '' : 'pages/';
      window.location.href = `${prefix}payment-failure.html?orderReference=${orderReference}&reason=${encodeURIComponent(err.message)}`;
    }
  },

  /**
   * Interactive Sandbox Modal for test mode evaluation without requiring live credentials.
   */
  openSandboxModal({ orderReference, razorpayOrderId, amount, currency, title, customer }) {
    let modalEl = document.getElementById('sandbox-checkout-modal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'sandbox-checkout-modal';
      document.body.appendChild(modalEl);
    }

    const formattedAmount = typeof formatCurrency === 'function' ? formatCurrency(amount) : `₹${amount}`;

    modalEl.innerHTML = `
      <div class="modal fade show d-block" tabindex="-1" style="background: rgba(7, 17, 31, 0.85); backdrop-filter: blur(8px); z-index: 9999;">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg" style="background: #0f1f35; color: #edf4ff; border-radius: 16px;">
            <div class="modal-header border-bottom border-secondary border-opacity-25 pb-3">
              <div class="d-flex align-items-center gap-2">
                <span class="badge bg-primary px-3 py-2"><i class="bi bi-shield-check me-1"></i> Razorpay Test Checkout</span>
                <span class="badge bg-secondary">Sandbox</span>
              </div>
              <button type="button" class="btn-close btn-close-white" id="close-sandbox-modal" aria-label="Close"></button>
            </div>
            <div class="modal-body py-4">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h5 class="mb-1 fw-bold text-white">${title || 'Service Payment'}</h5>
                  <p class="text-muted small mb-0">Ref: <code>${orderReference}</code></p>
                </div>
                <div class="text-end">
                  <div class="fs-4 fw-bold text-primary">${formattedAmount}</div>
                  <span class="badge bg-dark text-muted">${currency}</span>
                </div>
              </div>

              <div class="p-3 rounded mb-3" style="background: rgba(18, 37, 61, 0.7); font-size: 0.88rem;">
                <div class="d-flex justify-content-between mb-1">
                  <span class="text-muted">Customer:</span>
                  <span class="fw-semibold">${customer?.name || 'Client'}</span>
                </div>
                <div class="d-flex justify-content-between mb-1">
                  <span class="text-muted">Email:</span>
                  <span>${customer?.email || 'client@example.com'}</span>
                </div>
                <div class="d-flex justify-content-between">
                  <span class="text-muted">Razorpay Order ID:</span>
                  <code>${razorpayOrderId}</code>
                </div>
              </div>

              <div class="alert alert-info py-2 px-3 small border-0 d-flex align-items-center gap-2 mb-3" style="background: rgba(37, 99, 235, 0.15); color: #93c5fd;">
                <i class="bi bi-info-circle-fill fs-5"></i>
                <span>Testing Mode: Simulates instant payment capture and invokes server-side HMAC-SHA256 signature verification.</span>
              </div>

              <div class="d-grid gap-2">
                <button id="sandbox-btn-success" class="btn btn-primary btn-lg d-flex align-items-center justify-content-center gap-2">
                  <i class="bi bi-check2-circle fs-5"></i> Confirm & Authorize Payment
                </button>
                <button id="sandbox-btn-fail" class="btn btn-outline-danger d-flex align-items-center justify-content-center gap-2">
                  <i class="bi bi-x-circle fs-5"></i> Simulate Declined / Failed Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const cleanup = () => {
      modalEl.innerHTML = '';
    };

    document.getElementById('close-sandbox-modal')?.addEventListener('click', cleanup);

    document.getElementById('sandbox-btn-fail')?.addEventListener('click', () => {
      cleanup();
      const prefix = window.location.pathname.includes('/pages/') ? '' : 'pages/';
      window.location.href = `${prefix}payment-failure.html?orderReference=${orderReference}&reason=${encodeURIComponent('Card declined by issuing bank (Sandbox simulation)')}`;
    });

    document.getElementById('sandbox-btn-success')?.addEventListener('click', async () => {
      const btn = document.getElementById('sandbox-btn-success');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Verifying with backend...';
      }

      // Generate a mock payment ID and valid test signature
      const mockPayId = `pay_test_${Date.now().toString(36)}_${Math.random().toString(36).substring(7)}`;

      // Compute standard HMAC-SHA256 test signature using Web Crypto or simple hex
      const secret = 'test_razorpay_secret_for_local_testing';
      const textToSign = `${razorpayOrderId}|${mockPayId}`;

      let signature = '';
      try {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const cryptoKey = await window.crypto.subtle.importKey(
          'raw',
          keyData,
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const sigBuffer = await window.crypto.subtle.sign(
          'HMAC',
          cryptoKey,
          encoder.encode(textToSign)
        );
        signature = Array.from(new Uint8Array(sigBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      } catch (e) {
        signature = 'fallback_test_signature';
      }

      cleanup();

      await CheckoutService.verifyAndRedirect({
        orderReference,
        razorpayOrderId,
        razorpayPaymentId: mockPayId,
        razorpaySignature: signature,
      });
    });
  },
};

if (typeof window !== 'undefined') {
  window.CheckoutService = CheckoutService;
}
