import fs from 'fs/promises';
import path from 'path';
import { StorageDriver, StoredObject } from '../../types/storage.types';
import { contentTypeOf } from './keys';

const isMissing = (err: unknown): boolean => (err as NodeJS.ErrnoException).code === 'ENOENT';

// Development stand-in for the bucket: the same keys become paths under one folder, so switching
// to R2 changes nothing for the code that reads and writes objects
export class LocalStorageDriver implements StorageDriver {
  readonly name = 'local';

  constructor(private readonly root: string) {}

  private resolve(key: string): string {
    const target = path.resolve(this.root, ...key.split('/'));
    // The facade already rejects unsafe keys; this is the second lock on the same door
    if (target !== this.root && !target.startsWith(this.root + path.sep)) {
      throw new Error('[storage] key resolves outside the storage folder');
    }
    return target;
  }

  async put(key: string, body: Buffer): Promise<void> {
    const target = this.resolve(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body);
  }

  async get(key: string): Promise<StoredObject | null> {
    try {
      const body = await fs.readFile(this.resolve(key));
      return { body, contentType: contentTypeOf(key), size: body.length };
    } catch (err) {
      if (isMissing(err)) return null;
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.resolve(key), { force: true });
  }

  async deletePrefix(prefix: string): Promise<void> {
    await fs.rm(this.resolve(prefix.replace(/\/+$/, '')), { recursive: true, force: true });
  }

  async copy(sourceKey: string, targetKey: string): Promise<void> {
    const target = this.resolve(targetKey);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(this.resolve(sourceKey), target);
  }
}
