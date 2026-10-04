import { Depot, DepotInputData } from './company.types';
import { LatLng } from './geo.types';
import { Constraint } from './parameter.types';

// Values the frontend groups customers by; it reads them as plain strings.
export const REPLACE_TYPE = {
  subdistrict: 'SUB_DISTRICT CENTROID',
  district: 'DISTRICT CENTROID',
  province: 'PROVINCE CENTROID',
  none: 'ORIGINAL LOCATION',
  geocode: 'GEOCODE LOCATION',
  input: 'INPUT',
} as const;

export const VALIDATION_TYPE = {
  subdistrict: 'SUB_DISTRICT LEVEL',
  district: 'DISTRICT LEVEL',
  province: 'PROVINCE LEVEL',
  noValid: 'NO_VALID',
  nanInput: 'NAN_INPUT',
  nonValidated: 'NON_VALIDATED',
} as const;

export type ReplaceType = (typeof REPLACE_TYPE)[keyof typeof REPLACE_TYPE];
export type ValidationType = (typeof VALIDATION_TYPE)[keyof typeof VALIDATION_TYPE];

export interface NodeAddress {
  address: string;
  subdistrict: string | null;
  district: string | null;
  province: string | null;
  postalCode: number | null;
}

export interface NodeProduct {
  productId: string;
  skuCode: string;
  name: string;
  packagingType: string;
  productQuantity: number;
}

export interface NodeMetrics {
  excessWeight: number;
  excessVolume: number;
  excessDistance: number;
  excessDuration: number;
  hasExcessWeight: boolean;
  hasExcessVolume: boolean;
  hasExcessDistance: boolean;
  hasExcessDuration: boolean;
  hasMissingProducts: boolean;
  isNodeFeasible: boolean;
  associatedProductQuantity: NodeProduct[];
  missingProductQuantity: NodeProduct[];
  productIds: string[];
  missingProductIds: string[];
}

export interface CustomerNode {
  latitude: number | null;
  longitude: number | null;
  grade: string;
  validationType: ValidationType;
  replaceType: ReplaceType;
  originalAddress: NodeAddress;
  processedAddress: NodeAddress;
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
  metrics: NodeMetrics | null;
  productQuantity: NodeProduct[];
  label: number;
  allowVehicleGroupId: string[];
  additionalProperties: { channel: string; telephone: string; customerName: string; row: number };
  extra: { orderId: string; channel: string; customerName: string; tel: string; productsInfo: never[] };
}

// A depot as the run page reads it: the node fields the map needs plus the depot's own master
// data, since the page replaces its depot list with these entries after an upload.
export interface DepotNode {
  id: string;
  depotId: string;
  depotName: string;
  nodeId: string;
  index: number;
  name: string;
  isDepot: true;
  latitude: number;
  longitude: number;
  timeWindowEarly: string;
  timeWindowLate: string;
  createdAt: string;
  updatedAt: string;
  columns: string[];
  inputdata: DepotInputData[];
  deliveryWeight: number;
  pickupWeight: number;
  deliveryVolume: number;
  pickupVolume: number;
  serviceDuration: number;
  zone: string;
  required: boolean;
}

export interface TransformLocations {
  customers: CustomerNode[];
  depots: DepotNode[];
}

export interface IssueDetail {
  type: string;
  input?: string | number | null | undefined;
  inputType?: string | undefined;
  location?: Array<string | number> | undefined;
  message?: string | undefined;
  context?: Record<string, unknown> | undefined;
}

export interface TransformIssue {
  title: string;
  detail: IssueDetail[];
}

export interface ValidationIssue extends TransformIssue {
  errorType: string;
}

export interface TransformResult {
  statusCode: string;
  message: string;
  isSuccesses: boolean;
  isWarning: boolean;
  warning: TransformIssue[];
  error: TransformIssue[];
  data?:
    | {
        geoServiceStats: {
          totalGeocodeCount: number;
          totalSuccessfulGeocode: number;
          totalFailedGeocode: number;
          sourceStats: Array<{ source: string; count: number }>;
        };
        outputPaths: { locations: string };
      }
    | undefined;
}

export interface TransformOutcome {
  result: TransformResult;
  locations: TransformLocations | null;
  geocodedCount: number;
}

export interface ValidateSummary {
  filters: {
    constraints: { over_distance: CustomerNode[]; over_weight: CustomerNode[] };
    order_data: { invalid_coordinate: CustomerNode[] };
  };
  warning: { zero_weight: CustomerNode[] };
}

export interface ValidateResult {
  message: string;
  validate: ValidateSummary;
  isSuccesses: boolean;
  isWarning: boolean;
  warning: ValidationIssue[];
  error: ValidationIssue[];
}

export interface CustomerLocationUpdate {
  nodeId?: string | null | undefined;
  name?: string | null | undefined;
  index?: number | null | undefined;
  latitude: number;
  longitude: number;
}

export interface VehicleSelectionInput {
  vehicleTypeId: string;
  vehicleId?: string[] | null | undefined;
  numberOfVehiclesAvailable?: number | null | undefined;
}

// Saved next to the run so the page can restore the vehicle tab when it is reopened.
export interface VehicleSelection {
  vehicleTypeId: string;
  numberOfVehiclesAvailable: number;
  specificVehicleIds: string[];
}

export interface FleetVehicle {
  vehicleTypeId: string;
  vehicleTypeName: string;
  vehicleId: string | null;
  licensePlate: string | null;
  capacityKg: number;
  capacityVolume: number;
  maxDistanceKm: number;
  maxDurationMin: number;
  startMin: number;
  endMin: number;
  breakMin: number;
  fixedCost: number;
  unitDistanceCost: number;
  unitDurationCost: number;
}

export interface SolverDepot {
  nodeId: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface SolverInput {
  depot: SolverDepot;
  customers: CustomerNode[];
  fleet: FleetVehicle[];
  constraint: Constraint;
}

export interface RouteMetric {
  routeIndex: number;
  routeLabel: number;
  vehicleTypeId: string;
  vehicleTypeName: string;
  licensePlate: string | null;
  routeNodes: number[];
  customerCount: number;
  routeWeight: number;
  routeVolume: number;
  routeDistance: number;
  routeDuration: number;
  routeTravelDuration: number;
  routeServiceDuration: number;
  routeBreakDuration: number;
  routeCost: number;
  routeLegDistances: number[];
  routeArrivalTimes: number[];
  excessWeight: number;
  excessDistance: number;
  excessDuration: number;
  isRouteFeasible: boolean;
}

export interface SolverRoutingNode {
  index: number;
  nodeId: string;
  name: string;
  zone: string;
  isDepot: boolean;
  deliveryWeight: number;
  pickupWeight: number;
  deliveryVolume: number;
  serviceDuration: number;
  timeWindowEarly: number;
  timeWindowLate: number;
  latitude: number;
  longitude: number;
  originalAddress: NodeAddress;
  additionalProperties: Record<string, unknown>;
  productQuantity: NodeProduct[];
}

export interface VrpStats {
  customerCount: number;
  routeCount: number;
  feasibleRouteCount: number;
  infeasibleRouteCount: number;
  isSolutionFeasible: boolean;
  totalFitness: number;
  totalCost: number;
  totalWeight: number;
  totalVolume: number;
  totalDistance: number;
  totalDuration: number;
  totalTravelDuration: number;
  totalServiceDuration: number;
  totalBreakDuration: number;
  excessWeight: number;
  excessVolume: number;
  excessDistance: number;
  excessDuration: number;
  excessEarlyTime: number;
  excessLateTime: number;
  hasExcessWeight: boolean;
  hasExcessVolume: boolean;
  hasExcessDistance: boolean;
  hasExcessDuration: boolean;
  hasExcessEarlyTime: boolean;
  hasExcessLateTime: boolean;
  hasIncorrectOrder: boolean;
  dataUnits: { weightUnit: string; volumeUnit: string; distanceUnit: string; timeUnit: string };
  unassignedCustomers: Array<{ nodeId: string; name: string; reason: string }>;
}

export interface VrpSolution {
  vrpData: { routingNodes: SolverRoutingNode[] };
  solutionMetrics: { routeMetrics: RouteMetric[] };
}

export interface GeoJsonFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: { type: 'LineString'; coordinates: number[][] } | { type: 'Point'; coordinates: number[] };
}

export interface VrpGeoJson {
  routes: Array<{ type: 'FeatureCollection'; features: GeoJsonFeature[] }>;
  depots: GeoJsonFeature[];
}

export interface SolverOutput {
  solution: VrpSolution;
  stats: VrpStats;
}

export interface SheetData {
  headers: string[];
  rows: Array<Record<string, unknown>>;
}

export type CellValue = string | number | boolean | Date | null;

export interface SheetSpec {
  name: string;
  headers: string[];
  rows: CellValue[][];
  columnWidths?: number[] | undefined;
}

export interface ProductMasterEntry {
  productId: string;
  skuCode: string;
  name: string;
  packagingType: string;
  weightKg: number;
  volumeM3: number;
}

export interface TransformFile {
  keyName: string;
  fileName: string;
  sheet: SheetData;
}

export interface TransformInput {
  depot: Depot;
  files: TransformFile[];
  productMaster: Map<string, ProductMasterEntry> | null;
  serviceDurationMin: number;
}

export interface OrderDraft {
  orderId: string;
  row: number;
  customerName: string;
  tel: string;
  channel: string;
  address: NodeAddress;
  point: LatLng | null;
  products: Map<string, { name: string; quantity: number; unitWeight: number | null }>;
}

export interface Located {
  latitude: number | null;
  longitude: number | null;
  replaceType: ReplaceType;
  validationType: ValidationType;
  grade: string;
  processedAddress: NodeAddress;
  geocoded: boolean;
}

export interface RunLimits {
  weightKg: number;
  distanceKm: number;
  durationMin: number;
}

export interface ValidationInput {
  locations: TransformLocations;
  constraint: Constraint;
  fleet: FleetVehicle[];
  orderFileName: string;
  missingProducts: IssueDetail[];
}

export interface PlannedRoute {
  vehicle: FleetVehicle;
  stops: CustomerNode[];
}

export interface UnassignedCustomer {
  customer: CustomerNode;
  reason: 'invalid_coordinate' | 'exceeds_vehicle_limits' | 'no_vehicle_available';
}

export interface RoutePlan {
  routes: PlannedRoute[];
  unassigned: UnassignedCustomer[];
}

export interface VehicleLimits {
  weightKg: number;
  volumeM3: number;
  distanceKm: number;
  durationMin: number;
}

export interface RouteGeometry {
  coordinates: number[][];
  legDistancesKm: number[];
  legDurationsMin: number[];
  source: 'osrm' | 'estimate';
}

export interface OsrmResponse {
  code?: string;
  routes?: Array<{
    geometry?: { coordinates?: number[][] };
    legs?: Array<{ distance?: number; duration?: number }>;
  }>;
}

export interface BuiltPlan {
  solution: VrpSolution;
  stats: VrpStats;
  geoJson: VrpGeoJson;
  rerouteCount: number;
}
