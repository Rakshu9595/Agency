document.addEventListener('DOMContentLoaded', () => {
  const forms = document.querySelectorAll('form[data-form-type]');

  // Prefill authenticated user details if available
  if (typeof getCurrentUser === 'function') {
    const user = getCurrentUser();
    if (user) {
      const nameInput = document.getElementById('project-name');
      const emailInput = document.getElementById('project-email');
      if (nameInput && !nameInput.value) nameInput.value = user.name || '';
      if (emailInput && !emailInput.value) emailInput.value = user.email || '';
    }
  }

  // Prefill service from URL query param if present
  const urlParams = new URLSearchParams(window.location.search);
  const paramService = urlParams.get('service');
  if (paramService) {
    const serviceSelect = document.getElementById('project-type');
    if (serviceSelect) {
      for (let i = 0; i < serviceSelect.options.length; i++) {
        if (serviceSelect.options[i].text.toLowerCase().includes(paramService.toLowerCase())) {
          serviceSelect.selectedIndex = i;
          break;
        }
      }
    }
  }

  forms.forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const status = form.querySelector('.form-status');
      const formType = form.dataset.formType;
      const submitBtn = form.querySelector('button[type="submit"]');

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Submitting...';
      }

      try {
        if (formType === 'inquiry') {
          const nameInput = document.getElementById('project-name') || form.querySelector('input[placeholder*="name" i]');
          const emailInput = document.getElementById('project-email') || form.querySelector('input[type="email"]');
          const budgetSelect = document.getElementById('project-budget') || form.querySelector('select');
          const serviceSelect = document.getElementById('project-type') || form.querySelectorAll('select')[1];
          const briefTextarea = document.getElementById('project-brief') || form.querySelector('textarea');

          // Honeypot check
          const honeypot = document.getElementById('honeypot-website');
          if (honeypot && honeypot.value.trim().length > 0) {
            showStatus(status, 'Inquiry submitted successfully.', 'success');
            form.reset();
            return;
          }

          const nameInput = document.getElementById('project-name');
          const emailInput = document.getElementById('project-email');
          const phoneInput = document.getElementById('project-phone');
          const companyInput = document.getElementById('project-company');
          const websiteTypeSelect = document.getElementById('project-website-type');
          const titleInput = document.getElementById('project-title');
          const descInput = document.getElementById('project-description');
          const pagesInput = document.getElementById('project-pages');
          const featuresInput = document.getElementById('project-features');
          const audienceInput = document.getElementById('project-audience');
          const techInput = document.getElementById('project-tech');
          const budgetSelect = document.getElementById('project-budget');
          const timelineSelect = document.getElementById('project-timeline');
          const existingUrlInput = document.getElementById('project-existing-url');
          const refInput = document.getElementById('project-references');
          const designInput = document.getElementById('project-design-prefs');
          const notesInput = document.getElementById('project-notes');

          const payload = {
            name: nameInput ? nameInput.value.trim() : '',
            email: emailInput ? emailInput.value.trim() : '',
            phone: phoneInput ? phoneInput.value.trim() : '',
            company: companyInput ? companyInput.value.trim() : '',
            websiteType: websiteTypeSelect ? websiteTypeSelect.value : 'Business Website',
            service: websiteTypeSelect ? websiteTypeSelect.value.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'website-development',
            projectTitle: titleInput ? titleInput.value.trim() : 'Custom Website Project',
            description: descInput ? descInput.value.trim() : '',
            requiredPages: pagesInput ? pagesInput.value.trim() : '',
            requiredFeatures: featuresInput ? featuresInput.value.trim() : '',
            targetAudience: audienceInput ? audienceInput.value.trim() : '',
            preferredTech: techInput ? techInput.value.trim() : '',
            budgetRange: budgetSelect ? budgetSelect.value : '₹10,000 - ₹20,000',
            timeline: timelineSelect ? timelineSelect.value : 'Standard (2-3 weeks)',
            existingWebsiteUrl: existingUrlInput ? existingUrlInput.value.trim() : '',
            referenceLinks: refInput && refInput.value ? [refInput.value.trim()] : [],
            designPreferences: designInput ? designInput.value.trim() : '',
            additionalNotes: notesInput ? notesInput.value.trim() : '',
          };

          const res = await apiRequest('/project-inquiries', {
            method: 'POST',
            body: payload,
          });

          if (res.success && res.data) {
            const tracker = window.pravyukAnalytics || window.xevruniqAnalytics;
            if (typeof window !== 'undefined' && tracker) {
              tracker.trackInquirySubmitted(payload.service, payload.timeline);
            }
            const ref = res.data.referenceId;
            const container = document.getElementById('inquiry-form-container');
            if (container) {
              container.innerHTML = `
                <div class="text-center py-4">
                  <div class="display-3 text-success mb-3"><i class="bi bi-check-circle-fill"></i></div>
                  <h3 class="fw-bold text-dark">Requirement Brief Submitted!</h3>
                  <p class="text-muted lead">Your project inquiry has been logged under Reference ID:</p>
                  <div class="p-3 bg-light rounded-3 d-inline-block border border-primary border-opacity-50 mb-4">
                    <span class="fs-4 fw-bold text-primary font-monospace">${ref}</span>
                  </div>
                  <p class="text-muted small mx-auto mb-4" style="max-width: 500px;">
                    Our agency lead is reviewing your specifications. An official itemized quotation with milestone schedule will be posted to your account within 24 hours. No payment is required until you approve the proposal.
                  </p>
                  <div class="d-flex justify-content-center gap-3">
                    <a href="dashboard.html" class="btn btn-primary"><i class="bi bi-speedometer2 me-1"></i> View In Client Dashboard</a>
                    <a href="../index.html" class="btn btn-outline-secondary">Return Home</a>
                  </div>
                </div>
              `;
            } else {
              showStatus(status, `Inquiry submitted! Reference ID: ${ref}`, 'success');
              form.reset();
            }
          }
        } else if (formType === 'contact') {
          const nameInput = form.querySelector('input[type="text"]');
          const emailInput = form.querySelector('input[type="email"]');
          const messageInput = form.querySelector('textarea');

          const payload = {
            name: nameInput?.value.trim() || 'Website Visitor',
            email: emailInput?.value.trim() || '',
            service: 'website-development',
            description: messageInput?.value.trim() || 'General inquiry submitted from contact page.',
            customerType: 'individual',
            privacyConsent: true,
          };

          const res = await apiRequest('/leads', {
            method: 'POST',
            body: payload,
          });

          if (res.success) {
            const ref = res.data?.referenceId || '';
            showStatus(
              status,
              `Thank you! Your message has been received${ref ? ` (Ref: ${ref})` : ''}. We will contact you soon.`,
              'success'
            );
            form.reset();
          }
        }
      } catch (err) {
        showStatus(status, err.message || 'Submission failed. Please check your entries.', 'danger');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = formType === 'inquiry' ? 'Send project request' : 'Send message';
        }
      }
    });
  });
});
