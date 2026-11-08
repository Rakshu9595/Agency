/**
 * PRAVYUK Client-Side CMS Hydration Engine
 * Dynamically updates public site copy and business configuration from the CMS backend.
 */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const baseUrl = (window.APP_CONFIG && window.APP_CONFIG.apiBaseUrl) || 'http://localhost:5000/api/v1';

    // 1. Check Homepage CMS
    const isHomePage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '';
    if (isHomePage) {
      fetch(`${baseUrl}/content/homepage`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data && data.data.content) {
            hydrateHomepage(data.data.content);
          }
        })
        .catch(() => {});
    }

    // 2. Hydrate site settings
    fetch(`${baseUrl}/content/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data && data.data.settings) {
          hydrateSiteSettings(data.data.settings);
        }
      })
      .catch(() => {});
  } catch (e) {
    // Graceful fallback to static HTML
  }
});

function hydrateHomepage(content) {
  // Update Hero elements if present
  if (content.heroHeading) {
    const headingEl = document.querySelector('.hero-title, .hero h1, #hero-heading');
    if (headingEl) headingEl.textContent = content.heroHeading;
  }

  if (content.heroDescription) {
    const descEl = document.querySelector('.hero-description, .hero p, #hero-description');
    if (descEl) descEl.textContent = content.heroDescription;
  }

  if (content.eyebrow) {
    const eyebrowEl = document.querySelector('.hero-eyebrow, .eyebrow, #hero-eyebrow');
    if (eyebrowEl) eyebrowEl.textContent = content.eyebrow;
  }

  if (content.primaryCtaText) {
    const ctaEl = document.querySelector('#hero-primary-cta, .hero .btn-primary');
    if (ctaEl) ctaEl.textContent = content.primaryCtaText;
  }
}

function hydrateSiteSettings(settings) {
  if (settings.business && settings.business.isAcceptingInquiries === false) {
    const ctaBtns = document.querySelectorAll('a[href*="start-project.html"]');
    ctaBtns.forEach((btn) => {
      btn.setAttribute('title', 'Currently at capacity for new client projects');
    });
  }
}
