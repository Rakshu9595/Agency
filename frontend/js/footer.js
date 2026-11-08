document.addEventListener('DOMContentLoaded', () => {
  const footerTarget = document.getElementById('site-footer') || document.getElementById('footer-placeholder');
  if (!footerTarget) return;

  const rootPrefix = window.location.pathname.includes('/pages/') ? '../' : './';

  footerTarget.innerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            <div class="footer-brand">
              <img src="${rootPrefix}assets/images/pravyuk-logo-horizontal.svg" alt="Pravyuk" class="brand-logo-img" onerror="this.onerror=null; this.src='${rootPrefix}assets/images/pravyuk-logo-horizontal.png';" />
            </div>
            <p class="footer-tagline">Your Vision. Our Build.</p>
            <p class="footer-copy mb-3">Pravyuk transforms ideas into professional digital experiences. We design, build, and deploy bespoke websites, applications, and e-commerce platforms with clear milestones and full code ownership.</p>
            <div class="d-flex flex-column gap-1 text-muted small">
              <span><i class="bi bi-geo-alt me-1 text-primary"></i> Bengaluru, Karnataka, India</span>
              <span><i class="bi bi-envelope me-1 text-primary"></i> hello@pravyuk.com</span>
            </div>
          </div>
          <div>
            <h4>Services</h4>
            <ul class="footer-links">
              <li><a href="${rootPrefix}pages/landing-page-development.html">Landing Pages</a></li>
              <li><a href="${rootPrefix}pages/business-website-development.html">Business Websites</a></li>
              <li><a href="${rootPrefix}pages/ecommerce-development.html">E-Commerce Stores</a></li>
              <li><a href="${rootPrefix}pages/custom-web-applications.html">Custom Web Apps</a></li>
              <li><a href="${rootPrefix}pages/website-redesign.html">Website Redesign</a></li>
              <li><a href="${rootPrefix}pages/website-maintenance.html">Website Maintenance</a></li>
              <li><a href="${rootPrefix}pages/ui-ux-design.html">UI/UX Design</a></li>
            </ul>
          </div>
          <div>
            <h4>Process & Guides</h4>
            <ul class="footer-links">
              <li><a href="${rootPrefix}pages/how-it-works.html">How It Works</a></li>
              <li><a href="${rootPrefix}pages/pricing.html">Pricing & Custom Quotes</a></li>
              <li><a href="${rootPrefix}pages/projects.html">Selected Portfolio</a></li>
              <li><a href="${rootPrefix}pages/blog.html">Agency Articles</a></li>
              <li><a href="${rootPrefix}pages/blog-website-cost-india.html">Website Cost Guide</a></li>
              <li><a href="${rootPrefix}pages/blog-startup-website-guide.html">Startup Website Guide</a></li>
            </ul>
          </div>
          <div>
            <h4>Company & Legal</h4>
            <ul class="footer-links">
              <li><a href="${rootPrefix}pages/about.html">About Pravyuk</a></li>
              <li><a href="${rootPrefix}pages/contact.html">Contact Us</a></li>
              <li><a href="${rootPrefix}pages/start-project.html">Start Your Project</a></li>
              <li><a href="${rootPrefix}pages/privacy.html">Privacy Policy</a></li>
              <li><a href="${rootPrefix}pages/terms.html">Terms of Service</a></li>
              <li><a href="${rootPrefix}pages/refund-policy.html">Refund Policy</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-meta">
          <div class="footer-copy">© 2026 Pravyuk. All rights reserved. Your Vision. Our Build.</div>
          <div class="footer-meta-right">
            <span>Milestone Payments via Razorpay</span>
            <span>•</span>
            <span>100% Client Code Ownership</span>
          </div>
        </div>
      </div>
    </footer>
  `;
});
