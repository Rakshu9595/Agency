import crypto from 'node:crypto';

/**
 * Generate a unique, server-controlled reference ID for incoming leads.
 * Format: LEAD-YYYYMMDD-XXXXXX (e.g., LEAD-20261010-9F2B4D)
 *
 * @param {string} [prefix='LEAD'] - Optional prefix
 * @returns {string} Unique reference ID
 */
export const generateReferenceId = (prefix = 'LEAD') => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // 3 bytes = 6 hex characters
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();

  return `${prefix}-${dateStr}-${randomSuffix}`;
};
