import pool from '../database';
import { experimentRunner } from '../services';
import { seedWorkspace } from './seed/workspace';

seedWorkspace()
  .catch((err: Error) => {
    console.error(`[seed] ${err.stack ?? err.message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    experimentRunner.stop();
    return pool.end();
  });
