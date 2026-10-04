import { Request } from 'express';
import { FileUpload } from 'graphql-upload-ts';
import { PublicUser } from './user.types';

export interface GraphQLContext {
  user: PublicUser;
  req: Request;
}

export interface VehicleFilterArgs {
  depotId?: string | null;
  vehicleTypeId?: string | null;
}

export interface PreOrderArgs {
  input: {
    runId: string;
    depotId?: string[] | null;
    preOrderFiles: Array<{ file: Promise<FileUpload>; keyName?: string | null }>;
  };
}

export interface SampleOperation {
  name: string;
  folder: 'Experiments' | 'Master data' | 'Vehicles' | 'Parameters';
  query: string;
  variables?: Record<string, unknown>;
  /** Shown as a tab when the explorer opens; the rest ship in the collection only. */
  pinned?: boolean;
}
