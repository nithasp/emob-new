import { NextFunction, Request, Response } from 'express';
import { userService } from '../services';
import { verifyAccessToken } from '../services/token.service';
import { sendError } from '../utils/response';

export const verifyAuthToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    sendError(res, 401, 'Access denied. No token provided.', 'no_token');
    return;
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    sendError(res, 401, 'Invalid token.', 'token_invalid');
    return;
  }

  try {
    req.user = verifyAccessToken(token);
  } catch (err) {
    const name = (err as { name?: string }).name;
    if (name === 'TokenExpiredError') {
      sendError(res, 401, 'Access token has expired.', 'token_expired');
    } else {
      sendError(res, 401, 'Invalid token.', 'token_invalid');
    }
    return;
  }
  next();
};

// The account, its role and its company are read from the database on every request, so a removed
// or re-assigned user loses access at once instead of when the token expires (OWASP API5)
export const loadCurrentUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user ? await userService.findUser(req.user.userId) : null;
    if (!user) {
      sendError(res, 401, 'Invalid token.', 'token_invalid');
      return;
    }
    req.currentUser = user;
    req.user = { userId: user.id, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
};

export const authenticate = [verifyAuthToken, loadCurrentUser];
