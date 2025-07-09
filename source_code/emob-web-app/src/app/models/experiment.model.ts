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
  countGeocoding: number;
  countReroute: number;
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
  LocationBlobPathUrl: string;
  locationUpdateBlobPathUrl: string;
  validatedBlobPathUrl: string;
  outputGeoJsonUrl:string;
  outputReportUrl:string;
  outputPlanDetailUrl:string;
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


export interface DownloadResultFile {
  resultFileBlobPath: string;
  fileUrl: {
    resultFileBlobPathUrl: string;
  };
}

export interface ExperimentCounts extends Pick<Experiment, 'countGeocoding' | 'countReroute'> {}

export interface PlanDetail {
  TripNo: number;
  order_no: number;
  ORDERID_ORG: string;
  DELIVERYDATE: number;
  CUSTOMER_NAME: string;
  LatLng: string;
  ADDRESS: string;
  TUMBOL: string;
  AUMPHER: string;
  PROVICE: string;
  ZIPCODE: number;
  PRODUCTID: string;
  PRODUCTNAME: string;
  QUANTITYMAIN: number;
  QUANTITYMINOR: number;
  COMPANY_ID: number;
  EstimatedTime: string;
  Distance: number;
  TotalItemWeight: number;
  TotalVehicleWeight: number;
  created_date: string;
}

export interface NodeSheet {
  node_label: number;
  node_index: number;
  node_name: string;
  latitude: number;
  longitude: number;
  validation_type: string;
  replace_type: string;
  address: string;
}