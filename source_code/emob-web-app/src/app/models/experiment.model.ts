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
  locationBlobPath: string;
  locationUpdateBlobPath: string | null;
  validatedBlobPath: string | null;
  parameterBlobPath: string | null;
  outputRouteOptimizationBlobPath: string | null;
  configurations: ExperimentConfigurations;
  inputdata: InputDataItem[];
  depots: ExperimentDepot[];
  timeStart: string | null;
  timeEnd: string | null;
  timeDuration: number | null;
  triggeredBy: string;
  triggeredByName: string;
  status: StatusExperiment;
  run: string;
  groupId: string;
  countGeocoding: number;
  countReroute: number;
  fileUrl: FileUrl;
  result?: Result;
}

export enum StatusExperiment {
  Succeeded = 'Succeeded',
  InProgress = 'InProgress',
  Queued = 'Queued',
  Failed = 'Failed',
  Canceled = 'Canceled',
  Initializing = 'Initializing',
}

export interface ExperimentConfigurations {
  groupZone: string;
  productMat1: string;
  productMat7: string;
}

export interface InputDataItem {
  keyName: string;
  filename: string;
  blobPath: string;
  displayName: string;
  fileFormatType: string;
  fileSize: number;
}

export interface FileUrl {
  parameterUrl: string | null;
  preOrderUrl: string | null;
  LocationBlobPathUrl: string | null;
  locationUpdateBlobPathUrl: string | null;
  validatedBlobPathUrl: string | null;
  outputGeoJsonUrl: string | null;
  outputReportUrl: string | null;
  outputPlanDetailUrl: string | null;
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

export interface Company {
  companyName: string;
  depotType: string;
}

export interface DepotInputRequirement {
  companyName: string;
  depotId: string;
  keyName: string;
  displayName: string;
  columnRequired: string[];
  fileFormatType: string;
  required: boolean;
  createdAt: string;
  modifiedAt: string;
}

export interface MyDepot {
  depotId: string;
  depotName: string;
  latitude: number | string;
  longitude: number | string;
  tw_early: string;
  tw_late: string;
  createdAt: string;
  updatedAt: string;
  inputdata: DepotInputRequirement[];
  columns?: string[];
}

export interface myDepots {
  depotName: string;
  latitude: string;
  longitude: string;
  createdAt: string;
  updatedAt: string;
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

export interface ExperimentDepot {
  companyName: string;
  depotId: string;
  depotName: string;
  latitude: number;
  longitude: number;
  tw_early: string;
  tw_late: string;
  createdAt: string;
  updatedAt: string;
  columns?: string[];
  inputdata?: InputDataItem[];
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
