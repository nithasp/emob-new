import { AuthUser, PublicUser, UserRole } from './user.types';

export interface AccessTokenPayload {
  userId: string;
  role?: UserRole | undefined;
  roles?: UserRole[] | undefined;
  name?: string | undefined;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface IssuedSession extends TokenPair {
  user: PublicUser;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
}
