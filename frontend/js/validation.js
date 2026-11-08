/**
 * Client-side validation helpers
 */
export const Validator = {
  isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  },

  isValidPhone(phone) {
    if (!phone) return true; // Optional
    return /^[+0-9\s\-()]{7,25}$/.test(phone.trim());
  },

  isValidPassword(password) {
    return typeof password === 'string' && password.length >= 8;
  },

  validateForm(formElement) {
    const inputs = formElement.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    let firstInvalid = null;

    inputs.forEach((input) => {
      let fieldValid = true;
      const value = input.value.trim();

      if (!value) {
        fieldValid = false;
      } else if (input.type === 'email' && !this.isValidEmail(value)) {
        fieldValid = false;
      } else if (input.type === 'password' && input.hasAttribute('minlength')) {
        const min = parseInt(input.getAttribute('minlength'), 10) || 8;
        if (value.length < min) fieldValid = false;
      }

      if (input.type === 'checkbox' && !input.checked) {
        fieldValid = false;
      }

      if (!fieldValid) {
        isValid = false;
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
        if (!firstInvalid) firstInvalid = input;
      } else {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
      }
    });

    if (firstInvalid) {
      firstInvalid.focus();
    }

    return isValid;
  },
};

if (typeof window !== 'undefined') {
  window.Validator = Validator;
}
