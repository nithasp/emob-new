import supertest from 'supertest';

export type TestAgent = ReturnType<typeof supertest.agent>;

export interface UploadFile {
  path: string;
  name: string;
  type: string;
  content: Buffer;
}

export interface TestPlanner {
  id: string;
  username: string;
  password: string;
  token: string;
  agent: TestAgent;
  get(url: string): supertest.Test;
  post(url: string, body?: unknown): supertest.Test;
  gql(query: string, variables?: Record<string, unknown>): supertest.Test;
  upload(query: string, variables: Record<string, unknown>, files: UploadFile[]): supertest.Test;
}

export interface Run {
  runId: string;
  name: string;
  status: string;
  run: string;
  groupId: string;
  triggeredBy: string;
}

export interface ListedParameter {
  id: string;
  keyName: string;
  value: unknown;
}
