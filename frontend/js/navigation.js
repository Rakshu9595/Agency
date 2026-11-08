document.addEventListener('DOMContentLoaded', () => {
  const navbarTarget = document.getElementById('site-navbar') || document.getElementById('nav-placeholder');
  if (!navbarTarget) return;

  const currentPage = typeof getPageName === 'function' ? getPageName() : 'index';
  const isPagesFolder = window.location.pathname.includes('/pages/');
  const rootPrefix = isPagesFolder ? '../' : './';

  const loggedIn = typeof isLoggedIn === 'function' ? isLoggedIn() : Boolean(
    localStorage.getItem('pravyuk_token') || localStorage.getItem('xevruniq_token') || localStorage.getItem('agenet_token')
  );
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const isAdmin = user && user.role === 'admin';

  const authSection = loggedIn
    ? `
      <div class="nav-actions d-flex align-items-center gap-2">
        ${isAdmin ? `
          <a class="btn btn-outline-dark btn-sm" href="${rootPrefix}pages/admin.html">
            <i class="bi bi-shield-lock-fill me-1"></i> Admin
          </a>
        ` : ''}
        <a class="btn btn-outline-dark btn-sm" href="${rootPrefix}pages/dashboard.html">
          <i class="bi bi-speedometer2 me-1"></i> Client Portal
        </a>
        <button id="nav-logout-btn" class="btn btn-sm btn-outline-danger" title="Logout">
          <i class="bi bi-box-arrow-right"></i>
        </button>
      </div>
    `
    : `
      <div class="nav-actions d-flex align-items-center gap-2">
        <a class="btn btn-outline-dark btn-sm" href="${rootPrefix}pages/login.html">Sign In</a>
        <a class="btn btn-primary btn-sm" href="${rootPrefix}pages/start-project.html">
          <i class="bi bi-arrow-right-circle me-1"></i> Start Your Project
        </a>
      </div>
    `;

  navbarTarget.innerHTML = `
    <header class="site-header">
      <nav class="navbar navbar-expand-lg container">
        <a class="navbar-brand d-flex align-items-center" href="${rootPrefix}index.html" aria-label="Pravyuk Home">
          <img src="${rootPrefix}assets/images/pravyuk-logo-horizontal.svg" alt="Pravyuk — Your Vision. Our Build." class="brand-logo-img" onerror="this.onerror=null; this.src='${rootPrefix}assets/images/pravyuk-logo-horizontal.png';" />
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#siteNav" aria-controls="siteNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="siteNav">
          <ul class="navbar-nav mx-auto mb-2 mb-lg-0">
            <li class="nav-item"><a class="nav-link ${currentPage === 'index' ? 'active' : ''}" href="${rootPrefix}index.html">Home</a></li>
            <li class="nav-item"><a class="nav-link ${currentPage === 'how-it-works' ? 'active' : ''}" href="${rootPrefix}pages/how-it-works.html">How It Works</a></li>
            <li class="nav-item"><a class="nav-link ${currentPage === 'services' || currentPage.includes('development') || currentPage.includes('redesign') || currentPage.includes('maintenance') ? 'active' : ''}" href="${rootPrefix}pages/services.html">Services</a></li>
            <li class="nav-item"><a class="nav-link ${currentPage === 'projects' || currentPage === 'project-details' ? 'active' : ''}" href="${rootPrefix}pages/projects.html">Portfolio</a></li>
            <li class="nav-item"><a class="nav-link ${currentPage === 'pricing' ? 'active' : ''}" href="${rootPrefix}pages/pricing.html">Pricing & Quotes</a></li>
            <li class="nav-item"><a class="nav-link ${currentPage.includes('blog') ? 'active' : ''}" href="${rootPrefix}pages/blog.html">Articles</a></li>
            <li class="nav-item"><a class="nav-link ${currentPage === 'about' ? 'active' : ''}" href="${rootPrefix}pages/about.html">About</a></li>
            <li class="nav-item"><a class="nav-link ${currentPage === 'contact' ? 'active' : ''}" href="${rootPrefix}pages/contact.html">Contact</a></li>
          </ul>
          ${authSection}
        </div>
      </nav>
    </header>
  `;

  // Attach logout handler if present
  const navLogoutBtn = document.getElementById('nav-logout-btn');
  if (navLogoutBtn) {
    navLogoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof logoutUser === 'function') {
        logoutUser();
      } else {
        localStorage.removeItem('pravyuk_token');
        localStorage.removeItem('pravyuk_user');
        localStorage.removeItem('xevruniq_token');
        localStorage.removeItem('xevruniq_user');
        localStorage.removeItem('agenet_token');
        localStorage.removeItem('agenet_user');
        window.location.href = `${rootPrefix}pages/login.html`;
      }
    });
  }
});
