import { NextFunction, Request, Response } from 'express';
import { auditService } from '../services';
import { AuditAnnotation } from '../types/auditLog.types';
import { requestSource } from '../utils/request';

// A handler names the event worth keeping; the row itself is written once the response is out,
// so the status code is the one the client actually received
export const auditAs = (res: Response, annotation: AuditAnnotation): void => {
  res.locals.audit = annotation;
};

export const recordActivity = (req: Request, res: Response, next: NextFunction): void => {
  res.on('finish', () => {
    const annotation = res.locals.audit as AuditAnnotation | undefined;
    if (!annotation) return;
    auditService.recordEvent({
      ...requestSource(req),
      statusCode: res.statusCode,
      ...annotation,
      userId: annotation.userId ?? req.user?.userId ?? null,
      userRole: annotation.userRole ?? req.user?.role ?? null,
    });
  });
  next();
};
