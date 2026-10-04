import { Response } from 'express';
import { ErrorCode } from '../types/error.types';

export function sendSuccess<T>(res: Response, data: T, message: string, statusCode = 200): void {
  res.status(statusCode).json({ status: statusCode, message, data });
}

export function sendError(res: Response, statusCode: number, message: string, code: ErrorCode): void {
  res.status(statusCode).json({ status: statusCode, message, data: null, code });
}
