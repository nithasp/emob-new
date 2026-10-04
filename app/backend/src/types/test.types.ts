import supertest from 'supertest';

export type TestAgent = ReturnType<typeof supertest.agent>;

export interface UploadFile {
  /** Where the file goes in the operation, e.g. "variables.input.preOrderFiles.0.file". */
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
  /** GET of a path from the server root, as the file URLs come back from GraphQL. */
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
