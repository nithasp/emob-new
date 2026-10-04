import { Request } from 'express';
import { AuditSource } from '../types/auditLog.types';
import { PublicUser } from '../types/user.types';
import { AppError } from './errors';

// Every protected route runs behind `authenticate`; this keeps the account it loaded as the only
// source of "who is asking", so a body or query value can never stand in for it (OWASP API1)
export function currentUser(req: Request): PublicUser {
  if (!req.currentUser) throw new AppError('Access denied. No token provided.', 401, 'no_token');
  return req.currentUser;
}

export function requestSource(req: Request): AuditSource {
  return {
    method: req.method,
    path: req.originalUrl.split('?')[0],
    ipAddress: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
  };
}
