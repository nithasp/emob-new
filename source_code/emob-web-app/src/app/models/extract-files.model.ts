export type ObjectPath = string;

export interface Extraction<Extractable = unknown> {
  clone: unknown;
  files: Map<Extractable, Array<ObjectPath>>;
}

export type ExtractableFile = File | Blob;
