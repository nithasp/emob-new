import { Customer, Depot } from './pre-order.model';

export interface ExperimentState {
  runId: string;
  status: string;
  groupId: string;
  statusCode: string;
  message: string;
}

export interface Experiment {
  companyName: string;
  runId: string;
  name: string;
  timestamp: string;
  preOrderBlobPath: string;
  groupZoneBlobPath: string;
  productMat1BlobPath: string;
  productMat7BlobPath: string;
  parameterBlobPath: string;
  locationBlobPath: string;
  validatedBlobPath: string;
  outputRouteOptimizationBlobPath: string;
  timeStart: Date;
  timeEnd: Date;
  timeDuration: string;
  triggeredBy: string;
  triggeredByName: string;
  status: StatusExperiment;
  run: 'Original' | 'Rerun';
  groupId: string;
  countGeocoding: string;
  countReroute: string;
  result: Result;
  fileUrl: FileURL;
}

export enum StatusExperiment {
  Succeeded = 'Succeeded',
  InProgress = 'InProgress',
  Queued = 'Queued',
  Failed = 'Failed',
  Canceled = 'Canceled',
  Initializing = 'Initializing',
}

interface FileURL {
  parameterUrl: string;
  preOrderUrl: string;
  outputRouteOptimizationBlobPathUrl: string;
  LocationBlobPathUrl: string;
  locationUpdateBlobPathUrl: string;
  validatedBlobPathUrl: string;
}
export interface Result {
  customers: Customer[];
  depots: Depot[];
  validate: Validate;
}

export interface Validate {
  filters: Filters;
  warning: Warning;
}

interface Filters {
  constraints: Constraints;
  order_data: OrderData;
}
interface Constraints {
  over_distance: Customer[];
  over_weight: Customer[];
}
interface OrderData {
  invalid_coordinate: Customer[];
}

interface Warning {
  zero_weight: Customer[];
}
