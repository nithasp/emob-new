import { UserRole } from './user.types';

export const AUDIT_ACTIONS = [
  'CREATE',
  'READ',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGIN_FAILED',
  'LOGOUT',
  'REGISTER',
  'SECURITY',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditDetails = Record<string, string | number | boolean | string[]>;

export interface AuditSource {
  method?: string | null | undefined;
  path?: string | null | undefined;
  ipAddress?: string | null | undefined;
  userAgent?: string | null | undefined;
}

export interface NewAuditLog extends AuditSource {
  userId?: string | null | undefined;
  username?: string | null | undefined;
  userRole?: UserRole | null | undefined;
  action: AuditAction;
  event: string;
  statusCode?: number | null | undefined;
  details?: AuditDetails | null | undefined;
}

export type AuditAnnotation = Pick<
  NewAuditLog,
  'action' | 'event' | 'userId' | 'username' | 'userRole' | 'details'
>;
