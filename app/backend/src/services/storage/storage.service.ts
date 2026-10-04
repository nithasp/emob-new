import { config } from '../../config';
import { StorageDriver, StoredObject } from '../../types/storage.types';
import { AppError } from '../../utils/errors';
import { contentTypeOf, isSafeKey } from './keys';
import { LocalStorageDriver } from './local.driver';
import { R2StorageDriver } from './r2.driver';

export const FILES_PATH = '/api/v1/files';

export function createStorageDriver(): StorageDriver {
  if (config.storage.driver === 'r2') {
    const { accountId, accessKeyId, secretAccessKey, bucket, endpoint } = config.storage.r2;
    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error('[storage] the R2 credentials are incomplete');
    }
    return new R2StorageDriver({ accountId, accessKeyId, secretAccessKey, bucket, endpoint });
  }
  return new LocalStorageDriver(config.storage.localDir);
}

function assertSafe(key: string): void {
  if (!isSafeKey(key)) throw new AppError('Invalid file path', 400, 'invalid_request');
}

export function createStorageService(driver: StorageDriver) {
  return {
    driverName: driver.name,

    async put(key: string, body: Buffer, contentType: string = contentTypeOf(key)): Promise<void> {
      assertSafe(key);
      await driver.put(key, body, contentType);
    },

    putJson(key: string, value: unknown): Promise<void> {
      return this.put(key, Buffer.from(JSON.stringify(value), 'utf8'), 'application/json');
    },

    async get(key: string): Promise<StoredObject | null> {
      assertSafe(key);
      return driver.get(key);
    },

    async getJson<T>(key: string): Promise<T | null> {
      const object = await this.get(key);
      return object ? (JSON.parse(object.body.toString('utf8')) as T) : null;
    },

    async delete(key: string): Promise<void> {
      assertSafe(key);
      await driver.delete(key);
    },

    async deletePrefix(prefix: string): Promise<void> {
      assertSafe(prefix);
      await driver.deletePrefix(prefix);
    },

    async copy(sourceKey: string, targetKey: string): Promise<void> {
      assertSafe(sourceKey);
      assertSafe(targetKey);
      await driver.copy(sourceKey, targetKey);
    },

    // Files are served back through the API rather than straight from the bucket, so a download
    // needs the same access token as every other request
    fileUrl(key: string | null | undefined): string | null {
      if (!key) return null;
      return `${config.publicBaseUrl}${FILES_PATH}/${key.split('/').map(encodeURIComponent).join('/')}`;
    },
  };
}

export type StorageService = ReturnType<typeof createStorageService>;
