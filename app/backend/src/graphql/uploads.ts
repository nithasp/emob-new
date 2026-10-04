import { FileUpload } from 'graphql-upload-ts';
import { config } from '../config';
import { UploadedFile } from '../types/experiment.types';
import { AppError } from '../utils/errors';

// The multipart parser already stops a file that is larger than the limit; counting here as well
// keeps the bound in place whatever the parser's settings are (OWASP API4)
export async function readUpload(upload: Promise<FileUpload> | FileUpload): Promise<UploadedFile> {
  const { filename, mimetype, createReadStream } = await upload;
  const limit = config.upload.maxFileSizeBytes;
  const chunks: Buffer[] = [];
  let size = 0;

  const stream = createReadStream();
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
    size += buffer.length;
    if (size > limit) {
      stream.destroy();
      throw new AppError(
        `"${filename}" is larger than ${Math.floor(limit / (1024 * 1024))} MB`,
        413,
        'payload_too_large',
      );
    }
    chunks.push(buffer);
  }
  if (!size) throw new AppError(`"${filename}" is empty`, 400, 'invalid_request');

  return { filename, mimetype, content: Buffer.concat(chunks) };
}
