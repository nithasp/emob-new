import { Request, Response } from 'express';
import { storageService } from '../services';
import { baseNameOf, companyPrefix, isSafeKey } from '../services/storage/keys';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { currentUser } from '../utils/request';

const notFound = () => new AppError('File not found', 404, 'not_found');

// A file name can hold Thai text; the plain name keeps old clients working and filename* carries
// the exact one
function contentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export const download = asyncHandler(async (req: Request, res: Response) => {
  const segments = (req.params as { key?: string[] | string }).key;
  const key = Array.isArray(segments) ? segments.join('/') : (segments ?? '');

  // Every object lives under its company's prefix, and the prefix is taken from the signed-in
  // user: a key that points at another company's files is answered as if it did not exist
  // (OWASP API1)
  const ownPrefix = `${companyPrefix(currentUser(req).companyId)}/`;
  if (!isSafeKey(key) || !key.startsWith(ownPrefix)) throw notFound();

  const object = await storageService.get(key);
  if (!object) throw notFound();

  res.setHeader('Content-Type', object.contentType);
  res.setHeader('Content-Length', String(object.size));
  res.setHeader('Content-Disposition', contentDisposition(baseNameOf(key)));
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(object.body);
});
