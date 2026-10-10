window.APP_CONFIG = {
  apiBaseUrl: 'http://localhost:3000/api',
  appName: 'Agenet',
  payment: {
    provider: 'razorpay',
    enabled: false,
    mode: 'demo'
  },
  features: {
    auth: true,
    billing: true,
    membership: true
  }
};
