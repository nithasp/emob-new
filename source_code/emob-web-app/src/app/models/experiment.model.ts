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
  status: ExperimentStatus;
  run: Run;
  groupId: string;
  countGeocoding: number;
  countReroute: number;
  fileUrls: FileUrlsGroup;
  result?: Result;
}

export enum Run {
  Original = 'Original',
  Rerun = 'Rerun',
}

export enum ExperimentStatus {
  Initializing = 'Initializing',
  UploadCompleted = 'UploadCompleted',
  Succeeded = 'Succeeded',
  InProgress = 'InProgress',
  Queued = 'Queued',
  Failed = 'Failed',
  Canceled = 'Canceled',
  Cancelled = 'Cancelled'
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


export interface FileUrlsGroup {
  transform: TransformState;
  validate: ValidateState;
  plan: PlanState;
}

export interface TransformState {
  locations: string | null;
  warning: string | null;
}

export interface ValidateState {
  parameterFormats: string | null;
  vehicleTypes: string | null;
  preVRPSolution: string | null;
  errorWarning: string | null;
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
  isWarning?: boolean;
  warning?: ValidationWarningItem[];
}

export interface Validate {
  filters: Filters;
  warning: Warning;
}

export interface TransformLocationsData {
  customers: Customer[];
  depots: Depot[];
}

export interface MissingProductQuantity {
  productId?: string;
  skuCode?: string;
  name?: string;
  packagingType?: string;
}

export interface WarningDetailContext {
  missing_product_quantity?: MissingProductQuantity;
  [key: string]: unknown;
}

export interface WarningDetail {
  input?: string | number | null;
  type?: string;
  inputType?: string;
  context?: WarningDetailContext;
  [key: string]: unknown;
}

export interface TransformWarning {
  title: string;
  detail: WarningDetail[];
}

export interface ValidationWarningItem {
  errorType: string;
  title?: string;
  detail: WarningDetail[];
}

export interface TransformedAddress {
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: number;
}

export interface TransformedProductQuantity {
  productId: string;
  skuCode: string;
  name: string;
  packagingType: string;
  productQuantity: number;
}

export interface TransformedNodeMetrics {
  excessWeight: number;
  excessVolume: number;
  excessDistance: number;
  excessDuration: number;
  associatedProductQuantity: TransformedProductQuantity[];
  missingProductQuantity: TransformedProductQuantity[];
  hasExcessWeight: boolean;
  hasExcessVolume: boolean;
  hasExcessDistance: boolean;
  hasExcessDuration: boolean;
  hasMissingProducts: boolean;
  isNodeFeasible: boolean;
}

export interface TransformedNodeAdditionalProperties {
  channel?: string;
  telephone?: string;
  is_missing?: boolean[];
  product_ids?: string[];
  [key: string]: unknown;
}

export interface TransformedNode {
  latitude: number;
  longitude: number;
  grade: string;
  validationType: string;
  replaceType: string;
  originalAddress: TransformedAddress;
  processedAddress: TransformedAddress;
  nodeId: string;
  index: number;
  name: string;
  deliveryWeight: number;
  pickupWeight: number;
  deliveryVolume: number;
  pickupVolume: number;
  serviceDuration: number;
  loadingDuration: number;
  timeWindowEarly: number;
  timeWindowLate: number;
  priorityGroup: number;
  priority: number;
  prize: number;
  zone: string;
  isDepot: boolean;
  required: boolean;
  metrics: TransformedNodeMetrics;
  productQuantity: TransformedProductQuantity[];
  label: number;
  allowVehicleGroupId: string[];
  additionalProperties: TransformedNodeAdditionalProperties;
}

export interface TransformedProductAdditionalProperties {
  inner_pack?: number;
  type?: string;
  [key: string]: unknown;
}

export interface TransformedProduct {
  width: number;
  height: number;
  depth: number;
  volume: number;
  isdirectVolume: boolean;
  productId: string;
  skuCode: string;
  name: string;
  packagingType: string;
  temperature: string;
  weight: number;
  value: number;
  bomStructure: unknown | null;
  additionalProperties: TransformedProductAdditionalProperties;
}

export interface GeoSourceStat {
  source?: string;
  count?: number;
  successful?: number;
  failed?: number;
  [key: string]: unknown;
}

export interface GeoServiceStats {
  totalGeocodeCount: number;
  totalSuccessfulGeocode: number;
  totalFailedGeocode: number;
  sourceStats: GeoSourceStat[];
}

export interface TransformOutputPaths {
  locations: string;
  [key: string]: string;
}

export interface TransformInnerResult {
  depots: TransformedNode[];
  customers: TransformedNode[];
  products: TransformedProduct[];
}

export interface TransformData {
  geoServiceStats: GeoServiceStats;
  outputPaths: TransformOutputPaths;
  result: TransformInnerResult;
}

export interface TransformResult {
  statusCode?: string;
  message?: string;
  isSuccesses?: boolean;
  isWarning?: boolean;
  warning?: TransformWarning[];
  error?: TransformWarning[];
  data?: TransformData;
}

export interface UploadPreOrderResponse {
  name: string;
  timestamp?: string;
  groupId?: string;
  status?: ExperimentStatus;
  result?: TransformResult;
}

export interface ValidateResult {
  message?: string;
  validate?: Validate;
  isWarning?: boolean;
  warning?: ValidationWarningItem[];
}

export interface ValidateExperimentResponse {
  result?: ValidateResult;
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

