import pool from '../database';
import { NewAuditLog } from '../types/auditLog.types';
import { Queryable } from '../types/database.types';
import { clip } from '../utils/text';

export class AuditLogRepository {
  async create(entry: NewAuditLog, db: Queryable = pool): Promise<void> {
    await db.query(
      `INSERT INTO audit_logs
         (user_id, username, user_role, action, event, method, path, status_code, ip_address, user_agent, details)
       VALUES (
         COALESCE($1::uuid, (SELECT id FROM users WHERE LOWER(username) = LOWER($2))),
         COALESCE($2, (SELECT username FROM users WHERE id = $1::uuid)),
         $3, $4, $5, $6, $7, $8, $9, $10, $11
       )`,
      [
        entry.userId ?? null,
        clip(entry.username, 100),
        entry.userRole ?? null,
        entry.action,
        clip(entry.event, 60),
        clip(entry.method, 10),
        clip(entry.path, 255),
        entry.statusCode ?? null,
        clip(entry.ipAddress, 45),
        clip(entry.userAgent, 255),
        entry.details ? JSON.stringify(entry.details) : null,
      ],
    );
  }

  async deleteOlderThan(days: number, db: Queryable = pool): Promise<number> {
    const { rowCount } = await db.query(
      `DELETE FROM audit_logs WHERE created_at < NOW() - $1::int * INTERVAL '1 day'`,
      [days],
    );
    return rowCount ?? 0;
  }
}
