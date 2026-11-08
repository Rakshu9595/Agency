import crypto from 'node:crypto';

const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEFAULT_SECRET = process.env.SESSION_SECRET || 'agency-production-secure-default-jwt-secret-replace-in-env';

/**
 * Hash password securely using Node.js native scrypt.
 * Format: <salt>:<derivedKeyHex>
 * 
 * @param {string} password 
 * @returns {string}
 */
export const hashPassword = (password) => {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
};

/**
 * Verify password against hashed representation using timing-safe comparison.
 * 
 * @param {string} password 
 * @param {string} storedHash 
 * @returns {boolean}
 */
export const verifyPassword = (password, storedHash) => {
  if (!password || !storedHash || typeof storedHash !== 'string') return false;
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;

  const [salt, key] = parts;
  try {
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(key, 'hex');
    if (derivedKey.length !== keyBuffer.length) return false;
    return crypto.timingSafeEqual(derivedKey, keyBuffer);
  } catch (err) {
    return false;
  }
};

/**
 * Encode an object to base64url string.
 */
const base64UrlEncode = (str) => {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

/**
 * Decode a base64url string.
 */
const base64UrlDecode = (str) => {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
};

/**
 * Generate a cryptographically signed authentication token.
 * 
 * @param {Object} payload 
 * @param {number} [expiresInMs] 
 * @param {string} [secret] 
 * @returns {string} token
 */
export const generateToken = (payload, expiresInMs = TOKEN_EXPIRY_MS, secret = DEFAULT_SECRET) => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Date.now() + expiresInMs;
  const body = { ...payload, exp, iat: Date.now() };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(body));
  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${data}.${signature}`;
};

/**
 * Verify and decode signed authentication token.
 * 
 * @param {string} token 
 * @param {string} [secret] 
 * @returns {Object|null}
 */
export const verifyToken = (token, secret = DEFAULT_SECRET) => {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  try {
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && Date.now() > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch (err) {
    return null;
  }
};

/**
 * Verify Razorpay payment signature from Checkout callback.
 * 
 * @param {string} orderId 
 * @param {string} paymentId 
 * @param {string} signature 
 * @param {string} keySecret 
 * @returns {boolean}
 */
export const verifyRazorpayPaymentSignature = (orderId, paymentId, signature, keySecret) => {
  if (!orderId || !paymentId || !signature || !keySecret) return false;
  const data = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(data)
    .digest('hex');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expectedBuf = Buffer.from(expectedSignature, 'utf8');

  if (sigBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expectedBuf);
};

/**
 * Verify Razorpay webhook signature.
 * 
 * @param {Buffer|string} rawBody 
 * @param {string} signature 
 * @param {string} webhookSecret 
 * @returns {boolean}
 */
export const verifyRazorpayWebhookSignature = (rawBody, signature, webhookSecret) => {
  if (!rawBody || !signature || !webhookSecret) return false;
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expectedBuf = Buffer.from(expectedSignature, 'utf8');

  if (sigBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expectedBuf);
};
