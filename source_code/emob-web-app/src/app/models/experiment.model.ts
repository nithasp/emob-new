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
  configurations: any;
  inputdata: ExperimentInputdata[];
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
  fileUrls: FileUrlsGroup;
  result?: Result;
}

export enum StatusExperiment {
  Initializing = 'Initializing',
  UploadCompleted = 'UploadCompleted',
  Succeeded = 'Succeeded',
  InProgress = 'InProgress',
  Queued = 'Queued',
  Failed = 'Failed',
  Canceled = 'Canceled',
}

export interface ExperimentInputdata {
  keyName: string;
  filename: string;
  blobPath: string;
  displayName: string;
  fileFormatType: string;
  fileSize: number;
  fileUrl: string;
}

/** @deprecated Use ExperimentInputdata instead */
export type InputDataItem = ExperimentInputdata;

export interface FileUrlsGroup {
  transform: TransformState;
  validate: ValidateState;
  plan: PlanState;
}

export interface TransformState {
  locations: string | null;
}

export interface ValidateState {
  parameterFormats: string | null;
  vehicleTypes: string | null;
  preVRPSolution: string | null;
  vrpConfig: string | null;
}

export interface PlanState {
  vrpSolutionLean: string | null;
  geoJson: string | null;
  vrpStats: string | null;
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
  columnRequired: any;
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
  timeWindowEarly: string;
  timeWindowLate: string;
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

export interface ExperimentCounts
  extends Pick<Experiment, 'countGeocoding' | 'countReroute'> {}

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
  timeWindowEarly: string;
  timeWindowLate: string;
  createdAt: string;
  updatedAt: string;
  columns?: string[];
  inputdata?: DepotInputdata[];
}

export interface DepotInputdata {
  companyName: string;
  depotId: string;
  keyName: string;
  displayName: string;
  columnRequired: any;
  fileFormatType: string;
  required: boolean;
  createdAt: string;
  modifiedAt: string;
}

export interface NodeSheet {
  nodeLabel: number;
  nodeIndex: number;
  nodeName: string;
  latitude: number;
  longitude: number;
  validationType: string;
  replaceType: string;
  address: string;
}

export interface RouteInfo {
  routeLabel: string;
  numberDeliveryPoints: number;
  weight?: number;
  travelDistance?: number;
  travelDuration?: number;
  serviceTime?: number;
  [key: string]: string | number | undefined;
}

export interface PopupContent {
  routeLabel?: string;
  nodeIndex?: number;
  routeOrder?: number;
  name?: string;
  isDepot?: boolean;
  numCustomers?: number;
  distance?: number;
  duration?: number;
  weight?: number;
  zone?: string;
  customers?: string[];
  serviceDuration?: number;
  travelDuration?: number;
  originalAddress?: {
    address?: string;
    district?: string;
    province?: string;
    postalCode?: string;
  };
  extra?: {
    channel?: string;
    customerName?: string;
    tel?: string;
    productsInfo?: ProductInfo[];
  };
  [key: string]: string | number | boolean | string[] | object | undefined;
}

export interface ProductInfo {
  productId: string;
  orderId: string;
  productName: string;
  quantityMajor: number;
  quantityMinor: number;
  userConfirm?: string;
  dateConfirm?: string;
}

export interface PreOrderData {
  ORDERID?: string;
  PROVICE?: string;
  PROVINCE?: string;
  CHANNEL?: string;
  CUSTOMER_NAME?: string;
  TEL?: string;
  AUMPHER?: string;
  ZIPCODE?: string;
  ADDRESS?: string;
  latitude?: number;
  longitude?: number;
  LatLng?: string;
  validationType?: string;
  replaceType?: string;
}

export interface GeoJSONFeatureCollection {
  type: string;
  features: GeoJSONFeature[];
}

export interface GeoJSONFeature {
  type: string;
  properties: {
    nodeIndex?: number;
    name?: string;
    routeOrder?: number;
    weight?: number;
    color?: string;
    isDepot?: boolean;
    extra?: PopupContent['extra'];
    originalAddress?: PopupContent['originalAddress'];
    [key: string]: unknown;
  };
  geometry: {
    type: string;
    coordinates: number[] | number[][];
  };
}

export interface PlanDetailsData extends PreOrderData {
  ORDERID_ORG?: string;
  details?: Array<PreOrderData & ProductInfo>;
  validationType?: string;
  replaceType?: string;
}

export interface PointDetail {
  name: string;
  weight: number;
  routeOrder: number;
}

