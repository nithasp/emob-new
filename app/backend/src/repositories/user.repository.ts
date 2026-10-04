import pool from '../database';
import { Queryable } from '../types/database.types';
import { NewUserRow, PublicUser, StoredUser, UserProfileUpdate, UserRole } from '../types/user.types';
import { requireRow } from '../utils/rows';

const SAFE_FIELDS = `u.id, u.first_name, u.last_name, u.username, u.role, u.company_id, c.company_name`;
const FROM = 'FROM users u JOIN companies c ON c.id = u.company_id';

export class UserRepository {
  async show(id: string, db: Queryable = pool): Promise<PublicUser | null> {
    const { rows } = await db.query(`SELECT ${SAFE_FIELDS} ${FROM} WHERE u.id = $1`, [id]);
    return rows[0] ? toPublicUser(rows[0]) : null;
  }

  async findByUsername(username: string, db: Queryable = pool): Promise<PublicUser | null> {
    const { rows } = await db.query(`SELECT ${SAFE_FIELDS} ${FROM} WHERE LOWER(u.username) = LOWER($1)`, [
      username,
    ]);
    return rows[0] ? toPublicUser(rows[0]) : null;
  }

  // The only query that reads the password hash
  async findCredentials(username: string, db: Queryable = pool): Promise<StoredUser | null> {
    const { rows } = await db.query(
      `SELECT ${SAFE_FIELDS}, u.password ${FROM} WHERE LOWER(u.username) = LOWER($1)`,
      [username],
    );
    if (!rows[0]) return null;
    return { ...toPublicUser(rows[0]), passwordHash: rows[0].password as string };
  }

  async create(user: NewUserRow, db: Queryable = pool): Promise<PublicUser> {
    const { rows } = await db.query(
      `WITH created AS (
         INSERT INTO users (company_id, first_name, last_name, username, password, role)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, first_name, last_name, username, role, company_id
       )
       SELECT u.id, u.first_name, u.last_name, u.username, u.role, u.company_id, c.company_name
       FROM created u JOIN companies c ON c.id = u.company_id`,
      [user.companyId, user.firstName, user.lastName, user.username, user.passwordHash, user.role ?? 'BRS'],
    );
    return toPublicUser(requireRow(rows, 'INSERT INTO users'));
  }

  async updatePassword(id: string, passwordHash: string, db: Queryable = pool): Promise<boolean> {
    const { rowCount } = await db.query('UPDATE users SET password = $1 WHERE id = $2', [passwordHash, id]);
    return (rowCount ?? 0) > 0;
  }

  async updateProfile(id: string, profile: UserProfileUpdate, db: Queryable = pool): Promise<void> {
    await db.query('UPDATE users SET first_name = $1, last_name = $2, role = $3 WHERE id = $4', [
      profile.firstName,
      profile.lastName,
      profile.role,
      id,
    ]);
  }
}

function toPublicUser(row: Record<string, unknown>): PublicUser {
  return {
    id: row.id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    username: row.username as string,
    role: (row.role as UserRole | undefined) ?? 'BRS',
    companyId: row.company_id as string,
    companyName: row.company_name as string,
  };
}
