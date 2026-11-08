document.addEventListener('DOMContentLoaded', async () => {
  const servicesContainer = document.getElementById('pricing-services-list');
  const plansContainer = document.getElementById('pricing-memberships-list');

  // 1. Load services & package pricing
  if (servicesContainer) {
    try {
      const res = await apiRequest('/services');
      if (res.success && res.data && res.data.services) {
        renderServicesPricing(res.data.services, servicesContainer);
      }
    } catch (err) {
      console.warn('[Pricing] Could not load services:', err);
    }
  }

  // 2. Load membership plans
  if (plansContainer) {
    try {
      const res = await apiRequest('/memberships/plans');
      if (res.success && res.data && res.data.plans) {
        renderMembershipPlans(res.data.plans, plansContainer);
      }
    } catch (err) {
      console.warn('[Pricing] Could not load membership plans:', err);
    }
  }
});

function renderServicesPricing(services, container) {
  container.innerHTML = services
    .map((s) => {
      const priceText = typeof formatCurrency === 'function' ? formatCurrency(s.startingPrice) : `₹${s.startingPrice}`;
      const deliverablesList = (s.deliverables || [])
        .slice(0, 4)
        .map((d) => `<li class="d-flex align-items-center gap-2 mb-2"><i class="bi bi-check2 text-success"></i><span>${d}</span></li>`)
        .join('');

      return `
        <div class="col-lg-4 col-md-6 mb-4">
          <div class="card h-100 p-4 border-0 shadow-sm" style="background: rgba(17, 29, 47, 0.9); border-radius: 16px; border: 1px solid rgba(168, 191, 216, 0.15);">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <span class="badge bg-primary bg-opacity-25 text-primary border border-primary border-opacity-25">${s.category || 'Service'}</span>
              ${s.isPopular ? '<span class="badge bg-warning text-dark">Popular</span>' : ''}
            </div>
            <h4 class="text-white fw-bold mb-2">${s.name}</h4>
            <p class="text-muted small mb-3">${s.tagline || s.description.substring(0, 90)}...</p>
            <div class="my-3">
              <span class="text-muted small">Starting from</span>
              <div class="fs-3 fw-bold text-primary">${priceText}</div>
              <span class="text-muted small"><i class="bi bi-clock me-1"></i>Est. ${s.estimatedTimeline || '2-4 weeks'}</span>
            </div>
            <hr class="border-secondary border-opacity-25 my-3" />
            <ul class="list-unstyled text-muted small flex-grow-1">
              ${deliverablesList}
            </ul>
            <div class="d-grid gap-2 mt-3">
              <button class="btn btn-primary btn-book-service" data-service-slug="${s.slug}">
                <i class="bi bi-lightning-charge-fill me-1"></i> Book Package
              </button>
              <a href="start-project.html?service=${s.slug}" class="btn btn-outline-light btn-sm">
                Request Custom Scope
              </a>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  // Attach booking event handlers
  container.querySelectorAll('.btn-book-service').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const slug = e.currentTarget.dataset.serviceSlug;
      if (typeof CheckoutService !== 'undefined') {
        CheckoutService.initiateCheckout({
          orderType: 'service_package',
          serviceSlug: slug,
        });
      }
    });
  });
}

function renderMembershipPlans(plans, container) {
  container.innerHTML = plans
    .map((p) => {
      const priceText = typeof formatCurrency === 'function' ? formatCurrency(p.price) : `₹${p.price}`;
      const featuresList = (p.features || [])
        .map((f) => `<li class="d-flex align-items-center gap-2 mb-2"><i class="bi bi-check-circle-fill text-primary"></i><span>${f}</span></li>`)
        .join('');

      const highlightBorder = p.isPopular ? 'border: 2px solid #3ea5ff;' : 'border: 1px solid rgba(168, 191, 216, 0.15);';

      return `
        <div class="col-lg-4 col-md-6 mb-4">
          <div class="card h-100 p-4 border-0 shadow-sm position-relative" style="background: rgba(17, 29, 47, 0.95); border-radius: 16px; ${highlightBorder}">
            ${p.isPopular ? '<span class="position-absolute top-0 end-0 m-3 badge bg-primary px-3 py-2">Most Popular</span>' : ''}
            <h4 class="text-white fw-bold mb-2">${p.name}</h4>
            <p class="text-muted small mb-3">${p.description}</p>
            <div class="my-3">
              <div class="d-flex align-items-baseline gap-1">
                <span class="fs-2 fw-bold text-white">${priceText}</span>
                <span class="text-muted">/${p.billingInterval || 'mo'}</span>
              </div>
              <span class="badge bg-secondary bg-opacity-25 text-muted small mt-1">Cancel anytime • Retain access</span>
            </div>
            <hr class="border-secondary border-opacity-25 my-3" />
            <ul class="list-unstyled text-muted small flex-grow-1">
              ${featuresList}
            </ul>
            <button class="btn ${p.isPopular ? 'btn-primary' : 'btn-outline-light'} w-100 mt-3 btn-subscribe-plan" data-plan-id="${p.planId}">
              <i class="bi bi-stars me-1"></i> Join ${p.name}
            </button>
          </div>
        </div>
      `;
    })
    .join('');

  container.querySelectorAll('.btn-subscribe-plan').forEach((btn) => {
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
