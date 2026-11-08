document.addEventListener('DOMContentLoaded', async () => {
  const currentMembershipBanner = document.getElementById('current-membership-card');
  const plansContainer = document.getElementById('membership-plans-grid');

  // 1. Fetch current customer membership
  if (isLoggedIn()) {
    try {
      const res = await apiRequest('/memberships/me');
      if (res.success && res.data && res.data.hasMembership) {
        renderActiveMembership(res.data.membership, currentMembershipBanner);
      }
    } catch (e) {
      console.warn('[Membership] Could not load current membership:', e);
    }
  }

  // 2. Fetch available membership plans
  if (plansContainer) {
    try {
      const res = await apiRequest('/memberships/plans');
      if (res.success && res.data && res.data.plans) {
        renderPlans(res.data.plans, plansContainer);
      }
    } catch (e) {
      console.warn('[Membership] Could not load plans:', e);
    }
  }
});

function renderActiveMembership(membership, container) {
  if (!container) return;
  container.classList.remove('d-none');

  const renewalStr = membership.renewalDate ? new Date(membership.renewalDate).toLocaleDateString() : 'N/A';
  const isCancelled = membership.status === 'cancelled';

  container.innerHTML = `
    <div class="card p-4 border-0 mb-4 shadow" style="background: linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(17, 29, 47, 0.95)); border: 1px solid rgba(62, 165, 255, 0.3); border-radius: 16px;">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <span class="badge bg-success mb-2"><i class="bi bi-shield-fill-check me-1"></i> Active Membership</span>
          <h3 class="text-white fw-bold mb-1">${membership.planName || 'Agency Partner Pass'}</h3>
          <p class="text-muted small mb-0">
            ${isCancelled ? `Cancellation scheduled. Full access active until <strong>${renewalStr}</strong>.` : `Renews automatically on <strong>${renewalStr}</strong>.`}
          </p>
        </div>
        <div>
          ${
            !isCancelled
              ? '<button id="btn-cancel-membership" class="btn btn-outline-danger btn-sm">Cancel Renewal</button>'
              : '<span class="badge bg-secondary p-2">Cancelled (No Future Charges)</span>'
          }
        </div>
      </div>
      <div class="mt-3 pt-3 border-top border-secondary border-opacity-25">
        <span class="text-muted small d-block mb-2">Active Privileges & Entitlements:</span>
        <div class="d-flex flex-wrap gap-2">
          ${(membership.entitlements || []).map((ent) => `<span class="badge bg-dark text-info border border-info border-opacity-25"><i class="bi bi-check me-1"></i>${ent.replace(/_/g, ' ')}</span>`).join('')}
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-cancel-membership')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to cancel your membership renewal? You will retain access until the end of your billing cycle.')) return;
    try {
      const res = await apiRequest('/memberships/cancel', { method: 'POST' });
      if (res.success) {
        if (typeof NotificationService !== 'undefined') {
          NotificationService.success(res.message || 'Membership cancellation scheduled.');
        }
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch (err) {
      if (typeof NotificationService !== 'undefined') {
        NotificationService.error(err.message || 'Failed to cancel membership.');
      }
    }
  });
}

function renderPlans(plans, container) {
  container.innerHTML = plans
    .map((p) => {
      const priceText = typeof formatCurrency === 'function' ? formatCurrency(p.price) : `₹${p.price}`;
      const featuresList = (p.features || [])
        .map((f) => `<li class="d-flex align-items-center gap-2 mb-2"><i class="bi bi-check-circle-fill text-primary"></i><span>${f}</span></li>`)
        .join('');

      return `
        <div class="col-lg-4 col-md-6 mb-4">
          <div class="card h-100 p-4 border-0 shadow-sm" style="background: rgba(17, 29, 47, 0.95); border: 1px solid rgba(168, 191, 216, 0.15); border-radius: 16px;">
            ${p.isPopular ? '<span class="badge bg-primary px-3 py-2 align-self-start mb-2">Most Popular</span>' : ''}
            <h4 class="text-white fw-bold mb-2">${p.name}</h4>
            <p class="text-muted small mb-3">${p.description}</p>
            <div class="my-3">
              <span class="fs-2 fw-bold text-white">${priceText}</span>
              <span class="text-muted">/${p.billingInterval}</span>
            </div>
            <ul class="list-unstyled text-muted small flex-grow-1 my-3">
              ${featuresList}
            </ul>
            <button class="btn btn-primary w-100 mt-3 btn-join-plan" data-plan-id="${p.planId}">
              Join ${p.name}
            </button>
          </div>
        </div>
      `;
    })
    .join('');

  container.querySelectorAll('.btn-join-plan').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const planId = e.currentTarget.dataset.planId;
      if (typeof CheckoutService !== 'undefined') {
        CheckoutService.initiateCheckout({
          orderType: 'membership_subscription',
          membershipPlanId: planId,
        });
      }
    });
  });
}
