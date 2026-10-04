import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { R2Options, StorageDriver, StoredObject } from '../../types/storage.types';
import { contentTypeOf } from './keys';

const DELETE_BATCH_SIZE = 1000;

const isMissing = (err: unknown): boolean => {
  const { name, $metadata } = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  return name === 'NoSuchKey' || name === 'NotFound' || $metadata?.httpStatusCode === 404;
};

export class R2StorageDriver implements StorageDriver {
  readonly name = 'r2';
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(options: R2Options) {
    this.bucket = options.bucket;
    this.client = new S3Client({
      region: 'auto',
      endpoint: options.endpoint || `https://${options.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async get(key: string): Promise<StoredObject | null> {
    try {
      const object = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!object.Body) return null;
      const body = Buffer.from(await object.Body.transformToByteArray());
      return { body, contentType: object.ContentType ?? contentTypeOf(key), size: body.length };
    } catch (err) {
      if (isMissing(err)) return null;
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async deletePrefix(prefix: string): Promise<void> {
    let continuationToken: string | undefined;
    do {
      const page = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: `${prefix.replace(/\/+$/, '')}/`,
          MaxKeys: DELETE_BATCH_SIZE,
          ContinuationToken: continuationToken,
        }),
      );
      const keys = (page.Contents ?? []).flatMap((object) => (object.Key ? [{ Key: object.Key }] : []));
      if (keys.length) {
        await this.client.send(
          new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: keys, Quiet: true } }),
        );
      }
      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (continuationToken);
  }

  async copy(sourceKey: string, targetKey: string): Promise<void> {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        Key: targetKey,
        CopySource: `${this.bucket}/${sourceKey.split('/').map(encodeURIComponent).join('/')}`,
      }),
    );
  }
}
