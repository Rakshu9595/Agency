/**
 * Standardized API client for Agency Web Frontend
 */

async function apiRequest(endpoint, options = {}) {
  const baseUrl = (window.APP_CONFIG && window.APP_CONFIG.apiBaseUrl) || 'http://localhost:5000/api/v1';
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  const token = typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem('pravyuk_token') || localStorage.getItem('xevruniq_token') || localStorage.getItem('agenet_token'));

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      let errorMessage = 'An error occurred. Please try again.';
      if (typeof payload === 'object' && payload !== null) {
        errorMessage = payload.message || errorMessage;
        if (payload.errors && Array.isArray(payload.errors) && payload.errors.length > 0) {
          const detail = payload.errors.map((e) => e.message || e.field).join(', ');
          errorMessage = `${errorMessage} (${detail})`;
        }
      } else if (typeof payload === 'string' && payload) {
        errorMessage = payload;
      }

      const err = new Error(errorMessage);
      err.status = response.status;
      err.data = payload;
      throw err;
    }

    return payload;
  } catch (error) {
    if (error.status === 401 && typeof logoutUser === 'function') {
      // Session expired
      console.warn('[API] 401 Unauthorized encountered. Session cleared.');
    }
    throw error;
  }
}

// Global attachment
if (typeof window !== 'undefined') {
  window.apiRequest = apiRequest;
}
