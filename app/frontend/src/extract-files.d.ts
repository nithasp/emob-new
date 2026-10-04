declare module 'extract-files/extractFiles.mjs' {
  import { ObjectPath, Extraction } from './app/core/models/extract-files.model';

  export default function extractFiles<Extractable>(
    value: unknown,
    isExtractable: (value: unknown) => value is Extractable,
    path?: ObjectPath
  ): Extraction<Extractable>;
}

declare module 'extract-files/isExtractableFile.mjs' {
  import { ExtractableFile } from './app/core/models/extract-files.model';

  export default function isExtractableFile(
    value: unknown
  ): value is ExtractableFile;
}
