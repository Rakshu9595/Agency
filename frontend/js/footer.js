document.addEventListener('DOMContentLoaded', () => {
  const footerTarget = document.getElementById('site-footer');
  if (!footerTarget) return;

  const rootPrefix = window.location.pathname.includes('/pages/') ? '../' : './';

  footerTarget.innerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            <div class="footer-brand"><span>A</span>genet</div>
            <p class="footer-copy">Digital product strategy, creative systems, and customer-experience design for high-growth teams.</p>
          </div>
          <div>
            <h4>Company</h4>
            <ul class="footer-links">
              <li><a href="${rootPrefix}pages/about.html">About</a></li>
              <li><a href="${rootPrefix}pages/services.html">Services</a></li>
              <li><a href="${rootPrefix}pages/projects.html">Projects</a></li>
            </ul>
          </div>
          <div>
            <h4>Resources</h4>
            <ul class="footer-links">
              <li><a href="${rootPrefix}pages/pricing.html">Pricing</a></li>
              <li><a href="${rootPrefix}pages/membership.html">Membership</a></li>
              <li><a href="${rootPrefix}pages/contact.html">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4>Legal</h4>
            <ul class="footer-links">
              <li><a href="${rootPrefix}pages/privacy.html">Privacy</a></li>
              <li><a href="${rootPrefix}pages/terms.html">Terms</a></li>
              <li><a href="${rootPrefix}pages/refund-policy.html">Refund policy</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-meta">
          <div class="footer-copy">© 2025 Agenet</div>
          <div class="footer-meta">Built for modern founders and operators</div>
        </div>
      </div>
    </footer>
  `;
});
