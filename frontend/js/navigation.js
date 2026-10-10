document.addEventListener('DOMContentLoaded', () => {
  const navbarTarget = document.getElementById('site-navbar');
  if (!navbarTarget) return;

  const currentPage = getPageName();
  const isPagesFolder = window.location.pathname.includes('/pages/');
  const rootPrefix = isPagesFolder ? '../' : './';

  navbarTarget.innerHTML = `
    <header class="site-header">
      <nav class="navbar navbar-expand-lg container">
        <a class="navbar-brand" href="${rootPrefix}index.html"><span>A</span>genet</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#siteNav" aria-controls="siteNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="siteNav">
          <ul class="navbar-nav mx-auto">
            <li class="nav-item"><a class="nav-link ${currentPage === 'index' ? 'active' : ''}" href="${rootPrefix}index.html">Home</a></li>
            <li class="nav-item"><a class="nav-link ${currentPage === 'services' ? 'active' : ''}" href="${rootPrefix}pages/services.html">Services</a></li>
            <li class="nav-item"><a class="nav-link ${currentPage === 'projects' || currentPage === 'project-details' ? 'active' : ''}" href="${rootPrefix}pages/projects.html">Work</a></li>
            <li class="nav-item"><a class="nav-link ${currentPage === 'about' ? 'active' : ''}" href="${rootPrefix}pages/about.html">About</a></li>
            <li class="nav-item"><a class="nav-link ${currentPage === 'pricing' ? 'active' : ''}" href="${rootPrefix}pages/pricing.html">Pricing</a></li>
            <li class="nav-item"><a class="nav-link ${currentPage === 'contact' ? 'active' : ''}" href="${rootPrefix}pages/contact.html">Contact</a></li>
          </ul>
          <div class="nav-actions">
            <a class="btn btn-outline-light" href="${rootPrefix}pages/login.html">Login</a>
            <a class="btn btn-primary" href="${rootPrefix}pages/start-project.html">Start project</a>
          </div>
        </div>
      </nav>
    </header>
  `;
});
