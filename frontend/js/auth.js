document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.querySelector('.login-form');
  const registerForm = document.querySelector('.register-form');
  const forgotPasswordForm = document.querySelector('.forgot-password-form');

  const simulateAuth = (form, type, successMessage) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const status = form.querySelector('.form-status');
      if (!status) return;

      const fakeUser = {
        id: 'user-1',
        name: 'Agenet Client',
        email: 'hello@example.com',
        plan: 'Growth'
      };

      setAuthToken('demo-token');
      setCurrentUser(fakeUser);
      showStatus(status, successMessage, 'success');

      setTimeout(() => {
        if (type === 'login' || type === 'register') {
          window.location.href = 'dashboard.html';
        }
      }, 600);
    });
  };

  if (loginForm) simulateAuth(loginForm, 'login', 'Login successful. Redirecting to your dashboard...');
  if (registerForm) simulateAuth(registerForm, 'register', 'Account created. Redirecting to your dashboard...');
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const status = forgotPasswordForm.querySelector('.form-status');
      if (!status) return;
      showStatus(status, 'Password reset link sent. Check your inbox for the next steps.', 'info');
      forgotPasswordForm.reset();
    });
  }
});
