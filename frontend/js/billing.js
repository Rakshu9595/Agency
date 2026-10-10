document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('.btn-primary');
  if (btn) {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      window.location.href = 'payment-success.html';
    });
  }
});
