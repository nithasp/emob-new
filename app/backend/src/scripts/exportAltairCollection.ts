import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { SAMPLE_OPERATIONS } from '../graphql/operations';
import { GRAPHQL_PATH } from '../graphql/path';
import { SampleOperation } from '../types/graphql.types';

const OUTPUT = path.join(__dirname, '..', '..', 'altair', 'emob-api.agc');

const endpoint = `${config.publicBaseUrl || `http://localhost:${config.port}`}${GRAPHQL_PATH}`;

const toWindow = (operation: SampleOperation) => ({
  version: 1,
  type: 'window',
  windowName: operation.name,
  apiUrl: endpoint,
  query: operation.query,
  variables: JSON.stringify(operation.variables ?? {}, null, 2),
  subscriptionUrl: '',
  headers: [{ key: 'Authorization', value: 'Bearer {{accessToken}}', enabled: true }],
  preRequestScript: '',
  preRequestScriptEnabled: false,
  postRequestScript: '',
  postRequestScriptEnabled: false,
});

const folders = [...new Set(SAMPLE_OPERATIONS.map((operation) => operation.folder))];

const collection = {
  version: 1,
  type: 'collection',
  title: 'E-Mobility API',
  queries: [],
  collections: folders.map((folder) => ({
    title: folder,
    queries: SAMPLE_OPERATIONS.filter((operation) => operation.folder === folder).map(toWindow),
  })),
};

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(collection, null, 2)}\n`);

console.log(
  `[altair] wrote ${SAMPLE_OPERATIONS.length} operations for ${endpoint} to ${path.relative(process.cwd(), OUTPUT)}`,
);
