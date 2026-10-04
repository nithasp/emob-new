import fs from 'fs/promises';
import path from 'path';
import supertest from 'supertest';
import app from '../../app';
import { seedWorkspace } from '../../scripts/seed/workspace';
import { repositories, userService } from '../../services';
import { TestAgent, TestPlanner, UploadFile } from '../../types/test.types';

export const API = '/api/v1';
export const GRAPHQL = `${API}/graphql`;
export const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const PASSWORD = 'planner-pass-123';
const SAMPLE_DIR = path.resolve(__dirname, '..', '..', '..', 'sample-data');

export const api = supertest(app);

export const uniqueName = (prefix: string): string =>
  `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

let workspace: Promise<void> | undefined;

export const demoWorkspace = (): Promise<void> => (workspace ??= seedWorkspace({ quiet: true }));

export const sampleFile = (name: string): Promise<Buffer> => fs.readFile(path.join(SAMPLE_DIR, name));

function planner(id: string, username: string, token: string, agent: TestAgent): TestPlanner {
  const withAuth = (test: supertest.Test) => test.set('Authorization', `Bearer ${token}`);
  return {
    id,
    username,
    password: PASSWORD,
    token,
    agent,
    get: (url) => withAuth(agent.get(url)),
    post: (url, body) => withAuth(agent.post(`${API}${url}`)).send(body ?? {}),
    gql: (query, variables) => withAuth(agent.post(GRAPHQL)).send({ query, variables }),
    upload: (query, variables, files: UploadFile[]) => {
      const test = withAuth(agent.post(GRAPHQL))
        .set('Apollo-Require-Preflight', 'true')
        .field('operations', JSON.stringify({ query, variables }))
        .field('map', JSON.stringify(Object.fromEntries(files.map((file, i) => [String(i), [file.path]]))));
      files.forEach((file, i) => {
        void test.attach(String(i), file.content, { filename: file.name, contentType: file.type });
      });
      return test;
    },
  };
}

export async function registerPlanner(prefix = 'planner'): Promise<TestPlanner> {
  await demoWorkspace();
  const agent = supertest.agent(app);
  const username = uniqueName(prefix);
  const res = await agent
    .post(`${API}/auth/register`)
    .send({ username, password: PASSWORD, firstName: 'Test', lastName: 'Planner' })
    .expect(201);
  return planner(res.body.data.user.id, username, res.body.data.accessToken, agent);
}

export async function demoPlanner(): Promise<TestPlanner> {
  await demoWorkspace();
  const agent = supertest.agent(app);
  const res = await agent.post(`${API}/auth/demo`).expect(200);
  return planner(res.body.data.user.id, res.body.data.user.username, res.body.data.accessToken, agent);
}

export async function outsidePlanner(): Promise<TestPlanner> {
  await demoWorkspace();
  const company = await repositories.companies.upsert(uniqueName('Other Logistics'), 'Single');
  const username = uniqueName('outsider');
  await userService.upsertAccount({
    companyId: company.id,
    username,
    password: PASSWORD,
    firstName: 'Other',
    lastName: 'Planner',
    role: 'BRS',
  });

  const agent = supertest.agent(app);
  const res = await agent.post(`${API}/auth/login`).send({ username, password: PASSWORD }).expect(200);
  return planner(res.body.data.user.id, username, res.body.data.accessToken, agent);
}

export function cookiesOf(res: supertest.Response): string[] {
  const header = res.headers['set-cookie'];
  return Array.isArray(header) ? header : header ? [String(header)] : [];
}

export function refreshCookie(res: supertest.Response): string | undefined {
  return cookiesOf(res).find((cookie) => cookie.startsWith('refreshToken='));
}

export function cookieValue(cookie: string): string {
  return cookie.split(';')[0]?.split('=')[1] ?? '';
}
