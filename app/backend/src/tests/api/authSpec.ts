import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import supertest from 'supertest';
import app from '../../app';
import { config } from '../../config';
import pool from '../../database';
import {
  api,
  API,
  cookieValue,
  demoPlanner,
  demoWorkspace,
  refreshCookie,
  registerPlanner,
  uniqueName,
} from '../support/api';

const ME = `${API}/auth/me`;

async function ageRotation(token: string): Promise<void> {
  await pool.query(`UPDATE refresh_tokens SET used_at = used_at - INTERVAL '1 hour' WHERE token_hash = $1`, [
    createHash('sha256').update(token).digest('hex'),
  ]);
}

const refreshWith = (token: string) => api.post(`${API}/auth/refresh`).set('Cookie', `refreshToken=${token}`);

describe('Auth endpoints', () => {
  beforeAll(demoWorkspace);

  describe('POST /auth/register', () => {
    it('creates a planner in the demo company and returns an access token', async () => {
      const username = uniqueName('newplanner');
      const res = await api
        .post(`${API}/auth/register`)
        .send({ username, password: 'goodpass123', firstName: 'Jane', lastName: 'Doe' })
        .expect(201);

      expect(res.body.data.user.username).toBe(username);
      expect(res.body.data.user.name).toBe('Jane Doe');
      expect(res.body.data.user.role).toBe('BRS');
      expect(res.body.data.user.roles).toEqual(['BRS']);
      expect(res.body.data.user.companyName).toBe(config.demo.companyName);
      expect(typeof res.body.data.accessToken).toBe('string');
    });

    it('keeps the refresh token out of the body and in an HttpOnly cookie', async () => {
      const res = await api
        .post(`${API}/auth/register`)
        .send({ username: uniqueName('cookie'), password: 'goodpass123' })
        .expect(201);

      expect(res.body.data.refreshToken).toBeUndefined();

      const cookie = refreshCookie(res);
      expect(cookie).toBeDefined();
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Strict');
      expect(cookie).toContain('Path=/api/v1/auth');
    });

    it('ignores a role or a company sent with the registration', async () => {
      const res = await api
        .post(`${API}/auth/register`)
        .send({
          username: uniqueName('sneaky'),
          password: 'goodpass123',
          role: 'Admin',
          companyId: '00000000-0000-4000-8000-000000000000',
        })
        .expect(201);
      expect(res.body.data.user.role).toBe('BRS');
      expect(res.body.data.user.companyName).toBe(config.demo.companyName);
    });

    it('rejects a password shorter than eight characters', async () => {
      const res = await api
        .post(`${API}/auth/register`)
        .send({ username: uniqueName('short'), password: 'short' })
        .expect(400);
      expect(res.body.message).toBe('password must be at least 8 characters');
      expect(res.body.code).toBe('invalid_request');
    });

    it('rejects a username that is already taken in another case', async () => {
      const username = uniqueName('CaseTest');
      await api.post(`${API}/auth/register`).send({ username, password: 'goodpass123' }).expect(201);

      const res = await api
        .post(`${API}/auth/register`)
        .send({ username: username.toUpperCase(), password: 'goodpass123' })
        .expect(409);
      expect(res.body.message).toBe('Username already exists');
    });
  });

  describe('POST /auth/login', () => {
    it('signs in whatever case the username is typed in', async () => {
      const planner = await registerPlanner('caselogin');
      const res = await api
        .post(`${API}/auth/login`)
        .send({ username: planner.username.toUpperCase(), password: planner.password })
        .expect(200);
      expect(res.body.data.user.id).toBe(planner.id);
    });

    it('answers a wrong password with 401 and a code', async () => {
      const planner = await registerPlanner('wrongpass');
      const res = await api
        .post(`${API}/auth/login`)
        .send({ username: planner.username, password: 'not-the-password' })
        .expect(401);

      expect(res.body).toEqual({
        status: 401,
        message: 'Invalid username or password',
        data: null,
        code: 'invalid_credentials',
      });
    });

    it('answers an unknown username exactly like a wrong password', async () => {
      const res = await api
        .post(`${API}/auth/login`)
        .send({ username: uniqueName('nobody'), password: 'whatever-123' })
        .expect(401);
      expect(res.body.message).toBe('Invalid username or password');
      expect(res.body.code).toBe('invalid_credentials');
    });
  });

  describe('POST /auth/demo', () => {
    it('signs a visitor in as the seeded demo account with an ordinary session', async () => {
      const res = await api.post(`${API}/auth/demo`).expect(200);

      expect(res.body.data.user.username).toBe(config.demo.username);
      expect(res.body.data.user.roles).toEqual(['BRS']);
      expect(refreshCookie(res)).toContain('HttpOnly');

      const me = await api.get(ME).set('Authorization', `Bearer ${res.body.data.accessToken}`).expect(200);
      expect(me.body.data.username).toBe(config.demo.username);
    });
  });

  describe('access token', () => {
    it('is required', async () => {
      const res = await api.get(ME).expect(401);
      expect(res.body).toEqual({
        status: 401,
        message: 'Access denied. No token provided.',
        data: null,
        code: 'no_token',
      });
    });

    it('is refused when it is not a token', async () => {
      const res = await api.get(ME).set('Authorization', 'Bearer not-a-token').expect(401);
      expect(res.body.code).toBe('token_invalid');
    });

    it('is refused with token_expired once it has expired, so the client knows to renew it', async () => {
      const planner = await registerPlanner('expired');
      const expired = jwt.sign({ userId: planner.id, role: 'BRS' }, config.tokenSecret, {
        algorithm: 'HS256',
        expiresIn: -10,
      });

      const res = await api.get(ME).set('Authorization', `Bearer ${expired}`).expect(401);
      expect(res.body.code).toBe('token_expired');
    });

    it('is refused when it was signed with another secret', async () => {
      const planner = await registerPlanner('forged');
      const forged = jwt.sign({ userId: planner.id, role: 'Admin' }, 'x'.repeat(48), { algorithm: 'HS256' });

      const res = await api.get(ME).set('Authorization', `Bearer ${forged}`).expect(401);
      expect(res.body.code).toBe('token_invalid');
    });

    it('takes the role from the database, not from the token', async () => {
      const planner = await registerPlanner('claims');
      const inflated = jwt.sign({ userId: planner.id, role: 'Admin' }, config.tokenSecret, {
        algorithm: 'HS256',
        expiresIn: '5m',
      });

      const res = await api.get(ME).set('Authorization', `Bearer ${inflated}`).expect(200);
      expect(res.body.data.role).toBe('BRS');
    });

    it('stops working the moment the account is removed', async () => {
      const planner = await registerPlanner('removed');
      await planner.get(ME).expect(200);

      await pool.query('DELETE FROM users WHERE id = $1', [planner.id]);

      const res = await planner.get(ME).expect(401);
      expect(res.body.code).toBe('token_invalid');
    });
  });

  describe('POST /auth/refresh', () => {
    it('exchanges the cookie for a new access token and a new cookie', async () => {
      const agent = supertest.agent(app);
      const registered = await agent
        .post(`${API}/auth/register`)
        .send({ username: uniqueName('rotate'), password: 'goodpass123' })
        .expect(201);
      const first = cookieValue(refreshCookie(registered) ?? '');

      const res = await agent.post(`${API}/auth/refresh`).expect(200);
      const second = cookieValue(refreshCookie(res) ?? '');

      expect(typeof res.body.data.accessToken).toBe('string');
      expect(res.body.data.user.id).toBe(registered.body.data.user.id);
      expect(second).not.toBe('');
      expect(second).not.toBe(first);
    });

    it('refuses a request that carries no cookie', async () => {
      const res = await api.post(`${API}/auth/refresh`).expect(401);
      expect(res.body.message).toBe('Invalid or expired refresh token');
      expect(res.body.code).toBe('token_invalid');
    });

    it('renews a replay that arrives right after the rotation, as a second tab would send', async () => {
      const registered = await api
        .post(`${API}/auth/register`)
        .send({ username: uniqueName('twotabs'), password: 'goodpass123' })
        .expect(201);
      const first = cookieValue(refreshCookie(registered) ?? '');

      await refreshWith(first).expect(200);
      await refreshWith(first).expect(200);
    });

    it('revokes the whole session when a retired token comes back later', async () => {
      const registered = await api
        .post(`${API}/auth/register`)
        .send({ username: uniqueName('replay'), password: 'goodpass123' })
        .expect(201);
      const first = cookieValue(refreshCookie(registered) ?? '');

      const rotated = await refreshWith(first).expect(200);
      const second = cookieValue(refreshCookie(rotated) ?? '');
      await ageRotation(first);

      await refreshWith(first).expect(401);
      // The token that was still current goes with it: whoever holds it has to sign in again
      await refreshWith(second).expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('ends the session and clears the cookie', async () => {
      const planner = await registerPlanner('logout');

      const res = await planner.agent.post(`${API}/auth/logout`).expect(200);
      expect(refreshCookie(res)).toContain('refreshToken=;');

      await planner.agent.post(`${API}/auth/refresh`).expect(401);
    });

    it('answers 200 when there is no session to end', async () => {
      await api.post(`${API}/auth/logout`).expect(200);
    });
  });

  describe('POST /auth/logout-all', () => {
    it('ends every session of the account', async () => {
      const planner = await registerPlanner('everywhere');
      const other = supertest.agent(app);
      await other
        .post(`${API}/auth/login`)
        .send({ username: planner.username, password: planner.password })
        .expect(200);

      await planner.post('/auth/logout-all').expect(200);

      await planner.agent.post(`${API}/auth/refresh`).expect(401);
      await other.post(`${API}/auth/refresh`).expect(401);
    });

    it('needs an access token', async () => {
      await api.post(`${API}/auth/logout-all`).expect(401);
    });
  });

  describe('demo account', () => {
    it('is a planner like any other: its token opens the API', async () => {
      const demo = await demoPlanner();
      const res = await demo.gql('{ myCompany { companyName depotType } }').expect(200);
      expect(res.body.data.myCompany).toEqual({ companyName: config.demo.companyName, depotType: 'Single' });
    });
  });
});
