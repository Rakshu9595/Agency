async function apiRequest(endpoint, options = {}) {
  const url = `${window.APP_CONFIG.apiBaseUrl}${endpoint}`;
  const token = getAuthToken();

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = payload?.message || 'Request failed. Please try again.';
    throw new Error(message);
  }

  return payload;
}

async function mockApiRequest(endpoint, fallbackValue, options = {}) {
  if (!window.APP_CONFIG.apiBaseUrl || window.APP_CONFIG.apiBaseUrl === 'http://localhost:3000/api') {
    console.warn(`Backend endpoint not available for ${endpoint}. Using static fallback.`);
    return fallbackValue;
  }

  return apiRequest(endpoint, options);
}
