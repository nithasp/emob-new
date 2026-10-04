import 'express-serve-static-core';
import { PublicUser, UserRole } from './user.types';

declare module 'express-serve-static-core' {
  interface Request {
    user?: { userId: string; role: UserRole };
    currentUser?: PublicUser;
  }
}
