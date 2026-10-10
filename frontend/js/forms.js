document.addEventListener('DOMContentLoaded', () => {
  const forms = document.querySelectorAll('form[data-form-type]');

  forms.forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const status = form.querySelector('.form-status');
      const name = form.dataset.formType;

      if (!status) return;

      const message = {
        contact: 'Thanks! Your message has been captured and our team will reach out soon.',
        inquiry: 'Project request submitted. We will review your brief and contact you shortly.',
      }[name];

      showStatus(status, message || 'Request submitted successfully.', 'success');
      form.reset();
    });
  });
});
