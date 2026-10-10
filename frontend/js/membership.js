document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.membership-card a');

  buttons.forEach((button) => {
    button.addEventListener('click', (event) => {
      const link = event.currentTarget;
      const href = link.getAttribute('href');
      if (href && href.includes('billing.html')) {
        event.preventDefault();
        window.location.href = href;
      }
    });
  });
});
