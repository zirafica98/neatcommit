/**
 * Audit Service
 * 
 * Logs user actions for security and compliance
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';

export type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'repository.enable'
  | 'repository.disable'
  | 'repository.add'
  | 'review.view'
  | 'documentation.generate'
  | 'documentation.download'
  | 'settings.update';

export interface AuditLog {
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log audit event
 */
export async function logAuditEvent(log: AuditLog): Promise<void> {
  try {
    // For now, we'll log to Winston logger
    // In production, you might want to store in database
    logger.info('Audit event', {
      userId: log.userId,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      timestamp: new Date().toISOString(),
    });

    // TODO: Store in database if needed
    // await prisma.auditLog.create({ data: { ... } });
  } catch (error) {
    logger.error('Failed to log audit event:', error);
    // Don't throw - audit logging should not break the application
  }
}

/**
 * Check if user has access to repository
 */
export async function checkRepositoryAccess(
  userId: string,
  repositoryId: string
): Promise<boolean> {
  try {
    const repository = await prisma.repository.findUnique({
      where: { id: repositoryId },
      include: {
        installation: true,
      },
    });

    if (!repository) {
      return false;
    }

    // Check if user owns the installation
    if (repository.installation.userId === userId) {
      return true;
    }

    // Check if user is part of the organization (future feature)
    // For now, only installation owner has access

    return false;
  } catch (error) {
    logger.error('Failed to check repository access:', error);
    return false;
  }
}
