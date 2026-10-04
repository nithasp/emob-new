export const USER_ROLES = ['BRS', 'Admin'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  role: UserRole;
  companyId: string;
  companyName: string;
}

// Never sent to a client: it carries the password hash
export interface StoredUser extends PublicUser {
  passwordHash: string;
}

export interface NewUser {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  companyId: string;
  role?: UserRole | undefined;
}

export interface NewUserRow extends Omit<NewUser, 'password'> {
  passwordHash: string;
}

export interface UserRegistration {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AccountUpsert {
  companyId: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface UserProfileUpdate {
  firstName: string;
  lastName: string;
  role: UserRole;
}

// What a client receives: `roles` is the list the frontend's role guard checks, where an Admin
// also holds the planner role
export interface AuthUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  name: string;
  role: UserRole;
  roles: UserRole[];
  companyName: string;
}
