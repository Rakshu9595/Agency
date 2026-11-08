// Frontend runtime configuration
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

window.APP_CONFIG = {
  apiBaseUrl: isLocalhost ? 'http://localhost:5000/api/v1' : '/api/v1',
  appName: 'Pravyuk',
  tagline: 'Your Vision. Our Build.',
  agencyEmail: 'hello@pravyuk.com',
  canonicalUrl: window.location.origin,
  currency: 'INR',
  currencySymbol: '₹',
  razorpayKeyId: 'rzp_test_placeholder_key',
  payment: {
    provider: 'razorpay',
    currency: 'INR',
    enabled: true,
  },
  features: {
    auth: true,
    billing: true,
    membership: true,
    quotes: true,
  },
};
