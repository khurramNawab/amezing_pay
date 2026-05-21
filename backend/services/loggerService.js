import AuditLog from '../models/AuditLog.js';
import { logger } from './logger.js';

/**
 * Log a security-sensitive event
 */
export const logEvent = async ({ userId, event, status, req, metadata = {} }) => {
    try {
        await AuditLog.create({
            userId,
            event,
            status,
            ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            userAgent: req.headers['user-agent'],
            metadata
        });
    } catch (error) {
        logger.error('[AUDIT_LOG] Failed to create log', { message: error?.message, stack: error?.stack });
    }
};
