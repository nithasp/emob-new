import { Depot } from './company.types';
import { DynamicParameter } from './parameter.types';
import { TransformFile, TransformResult } from './pipeline.types';

export const EXPERIMENT_STATUSES = [
  'Initializing',
  'UploadCompleted',
  'Queued',
  'InProgress',
  'Succeeded',
  'Failed',
  'Cancelled',
] as const;

export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];

export type ExperimentRunKind = 'Original' | 'Rerun';

export interface ExperimentInputFile {
  keyName: string;
  filename: string;
  blobPath: string;
  displayName: string;
  fileFormatType: string;
  fileSize: number;
}

export interface UploadedInputFile {
  meta: ExperimentInputFile;
  content: Buffer;
  transform: TransformFile;
}

export interface ExperimentFiles {
  transform: { locations: string | null; warning: string | null };
  validate: {
    parameterFormats: string | null;
    vehicleTypes: string | null;
    preVRPSolution: string | null;
    errorWarning: string | null;
  };
  plan: { vrpSolutionLean: string | null; geoJson: string | null; vrpStats: string | null };
  result: string | null;
}

export interface ExperimentRow {
  runId: string;
  companyId: string;
  groupId: string;
  name: string;
  run: ExperimentRunKind;
  status: ExperimentStatus;
  triggeredBy: string;
  triggeredByName: string;
  timestamp: Date;
  timeStart: Date | null;
  timeEnd: Date | null;
  timeDuration: number | null;
  countGeocoding: number;
  countReroute: number;
  inputdata: ExperimentInputFile[];
  files: ExperimentFiles;
  parameters: DynamicParameter[];
  errorMessage: string | null;
  depotIds: string[];
}

export interface Experiment extends Omit<ExperimentRow, 'inputdata' | 'files' | 'parameters' | 'depotIds'> {
  companyName: string;
  configurations: unknown[];
  inputdata: Array<ExperimentInputFile & { fileUrl: string | null }>;
  depots: Depot[];
  fileUrls: Omit<ExperimentFiles, 'result'>;
}

export interface ExperimentState {
  runId: string;
  status: ExperimentStatus;
  groupId: string;
  statusCode: string;
  message: string;
}

export interface NewExperiment {
  companyId: string;
  name: string;
  triggeredBy: string;
  groupId?: string | undefined;
  run?: ExperimentRunKind | undefined;
  status?: ExperimentStatus | undefined;
  timestamp?: Date | undefined;
}

export interface ExperimentChanges {
  name?: string | undefined;
  run?: ExperimentRunKind | undefined;
  status?: ExperimentStatus | undefined;
  timeStart?: Date | null | undefined;
  timeEnd?: Date | null | undefined;
  timeDuration?: number | null | undefined;
  countGeocoding?: number | undefined;
  countReroute?: number | undefined;
  inputdata?: ExperimentInputFile[] | undefined;
  files?: ExperimentFiles | undefined;
  parameters?: DynamicParameter[] | undefined;
  errorMessage?: string | null | undefined;
  timestamp?: Date | undefined;
}

export interface UploadedFile {
  filename: string;
  mimetype: string;
  content: Buffer;
}

export interface PreOrderUpload {
  keyName: string;
  file: UploadedFile;
}

export interface DownloadResultFile {
  resultFileBlobPath: string;
  fileUrl: { resultFileBlobPathUrl: string };
}

export interface SolveOutcome {
  files: ExperimentFiles;
  rerouteCount: number;
}

export interface UploadPreOrderResult {
  name: string;
  timestamp: Date;
  groupId: string;
  status: string;
  result: TransformResult;
}

export const emptyExperimentFiles = (): ExperimentFiles => ({
  transform: { locations: null, warning: null },
  validate: { parameterFormats: null, vehicleTypes: null, preVRPSolution: null, errorWarning: null },
  plan: { vrpSolutionLean: null, geoJson: null, vrpStats: null },
  result: null,
});
