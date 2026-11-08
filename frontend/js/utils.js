function getJsonFromStorage(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function setJsonInStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getAuthToken() {
  return localStorage.getItem('pravyuk_token') || localStorage.getItem('xevruniq_token') || localStorage.getItem('agenet_token') || null;
}

function setAuthToken(token) {
  if (!token) {
    localStorage.removeItem('pravyuk_token');
    localStorage.removeItem('xevruniq_token');
    localStorage.removeItem('agenet_token');
    return;
  }

  localStorage.setItem('pravyuk_token', token);
  localStorage.setItem('xevruniq_token', token);
  localStorage.setItem('agenet_token', token);
}

function getCurrentUser() {
  return getJsonFromStorage('pravyuk_user', null) || getJsonFromStorage('xevruniq_user', null) || getJsonFromStorage('agenet_user', null);
}

function setCurrentUser(user) {
  if (!user) {
    localStorage.removeItem('pravyuk_user');
    localStorage.removeItem('xevruniq_user');
    localStorage.removeItem('agenet_user');
    return;
  }

  setJsonInStorage('pravyuk_user', user);
  setJsonInStorage('xevruniq_user', user);
  setJsonInStorage('agenet_user', user);
}

function isLoggedIn() {
  return Boolean(getAuthToken() && getCurrentUser());
}

function logoutUser() {
  localStorage.removeItem('pravyuk_token');
  localStorage.removeItem('pravyuk_user');
  localStorage.removeItem('xevruniq_token');
  localStorage.removeItem('xevruniq_user');
  localStorage.removeItem('agenet_token');
  localStorage.removeItem('agenet_user');

  const loginPath = window.location.pathname.includes('/pages/')
    ? '../pages/login.html'
    : 'pages/login.html';

  window.location.href = loginPath;
}

function showStatus(element, message, type = 'info') {
  if (!element) return;

  element.textContent = message;
  element.className = `form-status show ${type}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
}

function getPageName() {
  const path = window.location.pathname;
  const file = path.split('/').pop() || 'index.html';
  return file.replace(/\.html$/, '') || 'index';
}

function makeRelative(path) {
  const base = window.location.pathname.includes('/pages/') ? '../' : './';
  return `${base}${path}`;
}
