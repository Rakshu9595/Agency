document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.querySelector('.login-form');
  const registerForm = document.querySelector('.register-form');
  const forgotPasswordForm = document.querySelector('.forgot-password-form');
  const resetPasswordForm = document.querySelector('.reset-password-form');

  // 1. Handle Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusEl = loginForm.querySelector('.form-status');
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      const emailInput = document.getElementById('login-email') || loginForm.querySelector('input[type="email"]');
      const passwordInput = document.getElementById('login-password') || loginForm.querySelector('input[type="password"]');

      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      if (!email || !password) {
        if (typeof showStatus === 'function') showStatus(statusEl, 'Please provide both email and password.', 'danger');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';
      }

      try {
        const res = await apiRequest('/auth/login', {
          method: 'POST',
          body: { email, password },
        });

        if (res.success && res.data) {
          setAuthToken(res.data.token);
          setCurrentUser(res.data.user);

          if (typeof showStatus === 'function') {
            showStatus(statusEl, 'Login successful! Redirecting to your dashboard...', 'success');
          }

          // Check redirect query param
          const urlParams = new URLSearchParams(window.location.search);
          const redirect = urlParams.get('redirect') || 'dashboard.html';

          setTimeout(() => {
            window.location.href = redirect;
          }, 400);
        }
      } catch (err) {
        if (typeof showStatus === 'function') {
          showStatus(statusEl, err.message || 'Login failed. Please verify your credentials.', 'danger');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Sign in';
        }
      }
    });
  }

  // 2. Handle Registration
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusEl = registerForm.querySelector('.form-status');
      const submitBtn = registerForm.querySelector('button[type="submit"]');

      const firstNameInput = document.getElementById('register-first-name');
      const lastNameInput = document.getElementById('register-last-name');
      const emailInput = document.getElementById('register-email');
      const passwordInput = document.getElementById('register-password');
      const phoneInput = document.getElementById('register-phone');
      const companyInput = document.getElementById('register-company');

      const firstName = firstNameInput ? firstNameInput.value.trim() : '';
      const lastName = lastNameInput ? lastNameInput.value.trim() : '';
      const name = `${firstName} ${lastName}`.trim();
      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';
      const phone = phoneInput ? phoneInput.value.trim() : '';
      const company = companyInput ? companyInput.value.trim() : '';

      if (!name || !email || !password) {
        if (typeof showStatus === 'function') showStatus(statusEl, 'Please fill in all required fields.', 'danger');
        return;
      }

      if (password.length < 8) {
        if (typeof showStatus === 'function') showStatus(statusEl, 'Password must be at least 8 characters long.', 'danger');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating account...';
      }

      try {
        const res = await apiRequest('/auth/register', {
          method: 'POST',
          body: { name, email, password, phone, company },
        });

        if (res.success && res.data) {
          setAuthToken(res.data.token);
          setCurrentUser(res.data.user);

          if (typeof showStatus === 'function') {
            showStatus(statusEl, 'Account created successfully! Redirecting to dashboard...', 'success');
          }

          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 500);
        }
      } catch (err) {
        if (typeof showStatus === 'function') {
          showStatus(statusEl, err.message || 'Registration failed.', 'danger');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Create account';
        }
      }
    });
  }

  // 3. Handle Forgot Password
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusEl = forgotPasswordForm.querySelector('.form-status');
      const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');
      const emailInput = forgotPasswordForm.querySelector('input[type="email"]');
      const email = emailInput ? emailInput.value.trim() : '';

      if (!email) {
        if (typeof showStatus === 'function') showStatus(statusEl, 'Please enter your account email.', 'danger');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending instructions...';
      }

      try {
        const res = await apiRequest('/auth/forgot-password', {
          method: 'POST',
          body: { email },
        });

        let msg = res.message || 'Password reset instructions have been prepared.';
        if (res.data && res.data.resetTokenPreview) {
          msg += ` Demo link: <a href="reset-password.html?token=${res.data.resetTokenPreview}" class="alert-link text-white text-decoration-underline">Click here to reset password</a>`;
        }

        if (typeof showStatus === 'function') {
          showStatus(statusEl, msg, 'info');
        }
      } catch (err) {
        if (typeof showStatus === 'function') {
          showStatus(statusEl, err.message || 'Error requesting reset.', 'danger');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Send reset instructions';
        }
      }
    });
  }

  // 4. Handle Reset Password
  if (resetPasswordForm) {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const tokenInput = document.getElementById('reset-token');
    if (tokenInput && token) {
      tokenInput.value = token;
    }

    resetPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusEl = resetPasswordForm.querySelector('.form-status');
      const submitBtn = resetPasswordForm.querySelector('button[type="submit"]');

      const pwdInput = document.getElementById('new-password');
      const confirmInput = document.getElementById('confirm-password');
      const activeToken = tokenInput ? tokenInput.value : token;

      const newPassword = pwdInput ? pwdInput.value : '';
      const confirmPassword = confirmInput ? confirmInput.value : '';

      if (!activeToken) {
        if (typeof showStatus === 'function') showStatus(statusEl, 'Invalid or missing reset token.', 'danger');
        return;
      }

      if (newPassword.length < 8) {
        if (typeof showStatus === 'function') showStatus(statusEl, 'Password must be at least 8 characters.', 'danger');
        return;
      }

      if (newPassword !== confirmPassword) {
        if (typeof showStatus === 'function') showStatus(statusEl, 'Passwords do not match.', 'danger');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Updating password...';
      }

      try {
        const res = await apiRequest('/auth/reset-password', {
          method: 'POST',
          body: { token: activeToken, newPassword },
        });

        if (typeof showStatus === 'function') {
          showStatus(statusEl, res.message || 'Password reset successfully. Redirecting to login...', 'success');
        }

        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1500);
      } catch (err) {
        if (typeof showStatus === 'function') {
          showStatus(statusEl, err.message || 'Failed to reset password.', 'danger');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Update password';
        }
      }
    });
  }
});
