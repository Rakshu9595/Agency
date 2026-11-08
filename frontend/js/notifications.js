/**
 * Notification & Toast Manager for Agency Web
 */
export const NotificationService = {
  container: null,

  init() {
    if (this.container) return;
    let el = document.getElementById('toast-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-container';
      el.className = 'toast-container position-fixed top-0 end-0 p-3';
      el.style.zIndex = '9999';
      document.body.appendChild(el);
    }
    this.container = el;
  },

  show(message, type = 'info', duration = 4000) {
    this.init();
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const bgClass = {
      success: 'bg-success text-white',
      error: 'bg-danger text-white',
      warning: 'bg-warning text-dark',
      info: 'bg-primary text-white',
    }[type] || 'bg-dark text-white';

    const icon = {
      success: 'bi-check-circle-fill',
      error: 'bi-exclamation-octagon-fill',
      warning: 'bi-exclamation-triangle-fill',
      info: 'bi-info-circle-fill',
    }[type] || 'bi-bell-fill';

    const toast = document.createElement('div');
    toast.id = id;
    toast.className = `toast align-items-center ${bgClass} border-0 show shadow-lg mb-2`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="bi ${icon}"></i>
          <span>${message}</span>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;

    const closeBtn = toast.querySelector('.btn-close');
    closeBtn.addEventListener('click', () => toast.remove());

    this.container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        if (toast.parentElement) toast.remove();
      }, duration);
    }

    return toast;
  },

  success(msg, duration) {
    return this.show(msg, 'success', duration);
  },

  error(msg, duration) {
    return this.show(msg, 'error', duration);
  },

  warning(msg, duration) {
    return this.show(msg, 'warning', duration);
  },

  info(msg, duration) {
    return this.show(msg, 'info', duration);
  },
};

// Global attachment for non-module scripts
if (typeof window !== 'undefined') {
  window.NotificationService = NotificationService;
}
