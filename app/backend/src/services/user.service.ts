import { config } from '../config';
import { UserServiceDeps } from '../types/service.types';
import { AccountUpsert, AuthUser, PublicUser, UserRegistration } from '../types/user.types';
import { AppError } from '../utils/errors';
import { hashPassword, spendVerifyTime, verifyPassword } from './password.service';
import { displayName, rolesOf } from './token.service';

export const toAuthUser = (user: PublicUser): AuthUser => ({
  id: user.id,
  username: user.username,
  firstName: user.firstName,
  lastName: user.lastName,
  name: displayName(user),
  role: user.role,
  roles: rolesOf(user.role),
  companyName: user.companyName,
});

const toPublicUser = (user: PublicUser): PublicUser => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  username: user.username,
  role: user.role,
  companyId: user.companyId,
  companyName: user.companyName,
});

export function createUserService({ users, companies }: UserServiceDeps) {
  function findUser(id: string): Promise<PublicUser | null> {
    return users.show(id);
  }

  return {
    findUser,

    findByUsername(username: string): Promise<PublicUser | null> {
      return users.findByUsername(username);
    },

    async requireUser(id: string): Promise<PublicUser> {
      const user = await findUser(id);
      if (!user) throw new AppError('Invalid token.', 401, 'token_invalid');
      return user;
    },

    // A new account always joins the shared workspace as a planner; the role and the company are
    // never taken from the request (OWASP API3 mass assignment)
    async register(input: UserRegistration): Promise<PublicUser> {
      if (await users.findByUsername(input.username)) {
        throw new AppError('Username already exists', 409, 'conflict');
      }
      const company =
        (await companies.findByName(config.demo.companyName)) ??
        (await companies.upsert(config.demo.companyName, 'Single'));

      return users.create({
        companyId: company.id,
        firstName: input.firstName,
        lastName: input.lastName,
        username: input.username,
        passwordHash: await hashPassword(input.password),
        role: 'BRS',
      });
    },

    // Seeding only: creates the account, or refreshes its name, role and password when it exists
    async upsertAccount(input: AccountUpsert): Promise<PublicUser> {
      const passwordHash = await hashPassword(input.password);
      const existing = await users.findByUsername(input.username);
      if (!existing) {
        return users.create({
          companyId: input.companyId,
          firstName: input.firstName,
          lastName: input.lastName,
          username: input.username,
          passwordHash,
          role: input.role,
        });
      }
      await users.updateProfile(existing.id, {
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
      });
      await users.updatePassword(existing.id, passwordHash);
      return { ...existing, firstName: input.firstName, lastName: input.lastName, role: input.role };
    },

    async authenticate(username: string, password: string): Promise<PublicUser | null> {
      const stored = await users.findCredentials(username);
      if (!stored) {
        await spendVerifyTime();
        return null;
      }
      const matches = await verifyPassword(password, stored.passwordHash);
      return matches ? toPublicUser(stored) : null;
    },
  };
}

export type UserService = ReturnType<typeof createUserService>;
