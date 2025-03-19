import { Customer, Depot } from './pre-order.model';

export interface Experiment {
  groupId: string;
  name: string;
  run: 'Original' | 'Rerun';
  runId: string;
  status:StatusExperiment;
  timeDuration: string;
  timeEnd: string;
  timeStart: string;
  timestamp: string;
  triggeredBy: string;
}
enum StatusExperiment {
  Succeeded = 'Succeeded',
  InProgress = 'In Progress',
  Queued = 'Queued',
  Failed = 'Failed',
  Canceled = 'Canceled',
  Initializing = 'Initializing',
}

export interface ValidateExperiment {
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
  timeStart: string;
  timeEnd: string;
  timeDuration: string;
  triggeredBy: string;
  status: string;
  run: string;
  groupId: string;
  countGeocoding: string;
  countReroute: string;
  result: Result;
  fileUrl: FileURL;
}
interface FileURL {
  parameterUrl: string;
  preOrderUrl: string;
  outputRouteOptimizationBlobPathUrl: string;
  LocationBlobPathUrl: string;
}
interface Result {
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
