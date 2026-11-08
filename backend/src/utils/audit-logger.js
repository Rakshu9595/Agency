import { AuditLog } from '../models/AuditLog.js';
import { isDatabaseConnected, memoryStore } from './memory-store.js';

/**
 * Record an administrative audit log entry.
 *
 * @param {Object} params
 * @param {Object} [params.req] - Express request object for IP and user-agent
 * @param {Object} params.actor - Actor details { id, name, email, role }
 * @param {string} params.action - Action name e.g. 'service.create', 'inquiry.status_update'
 * @param {string} params.resourceType - Type of resource e.g. 'service', 'quote', 'settings'
 * @param {string} [params.resourceId] - ID of modified resource
 * @param {Object} [params.details] - Before/after or payload details
 */
export const recordAuditLog = async ({ req, actor, action, resourceType, resourceId = '', details = {} }) => {
  try {
    const ip = req ? (req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '') : '';
    const userAgent = req ? (req.headers['user-agent'] || '') : '';

    const entry = {
      actorId: actor?.id || actor?._id || 'system',
      actorName: actor?.name || 'System User',
      actorEmail: actor?.email || '',
      actorRole: actor?.role || 'admin',
      action,
      resourceType,
      resourceId: String(resourceId || ''),
      details,
      ip: String(ip),
      userAgent: String(userAgent),
      createdAt: new Date(),
    };

    if (isDatabaseConnected()) {
      await AuditLog.create(entry);
    } else {
      memoryStore.logAction(entry);
    }
  } catch (err) {
    console.error(`[AuditLog Error] Failed to record log for ${action}:`, err.message);
  }
};
