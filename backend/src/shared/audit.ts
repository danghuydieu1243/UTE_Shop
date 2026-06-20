import { sequelize } from './db/sequelize';
import { logger } from './logger';

export interface AuditInput {
  actorUserId?: number | null;
  action: string;
  entityType?: string | null;
  entityId?: number | null;
  metadata?: unknown;
  ip?: string | null;
}

export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await sequelize.query(
      'INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      {
        replacements: [
          input.actorUserId ?? null,
          input.action,
          input.entityType ?? null,
          input.entityId ?? null,
          input.metadata ? JSON.stringify(input.metadata) : null,
          input.ip ?? null,
          new Date(),
        ],
      },
    );
  } catch (e) {
    logger.warn({ err: e }, 'writeAudit failed');
  }
}
