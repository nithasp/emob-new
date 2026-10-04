import { DepotInputRequirement } from "./experiment.model";

export interface Vehicle {
  companyName: string;
  vehicleId: string;
  licensePlate: string;
  startDepotId: string;
  endDepotId: string;
  vehicleType: VehicleType;
  isActive: boolean;
  createdAt: string;
  modifiedAt: string;
}

export interface Depot {
  companyName?: string;
  depotId: string;
  depotName: string;
  latitude: number;
  longitude: number;
  timeWindowEarly: string;
  timeWindowLate: string;
  createdAt: string;
  updatedAt: string;
  inputdata?: DepotInputRequirement[];
}

export interface MyVehicles {
  companyName: string;
  vehicleId: string;
  licensePlate: string;
  startDepotId: Depot;
  endDepotId: Depot;
  vehicleTypeId: string;
  vehicleType: VehicleType;
  isActive: boolean;
  createdAt: string;
  modifiedAt: string;
}

export interface Dimension {
  width: number;
  height: number;
  depth: number;
}

export interface Break {
  duration: string;
  timeWindowEarly: string;
  timeWindowLate: string;
  name: string;
}

export interface VehicleBreak {
  name: string;
  duration: string;
  timeWindowEarly: string;
  timeWindowLate: string;
}

export interface VehicleType {
  vehicleTypeId: string;
  name: string;
  access: AccessTypeEnum[] | null;
  allowedBreaks?: Break[];
  dimension: Dimension | null;
  maximumWeightCapacity: number;
  maximumVolumeCapacity: number;
  timeWindowEarly: string;
  timeWindowLate: string;
  maximumDistance: number;
  maximumDuration: string;
  vehicleGroupId?: string;
  fixedCost: number;
  unitDistanceCost: number;
  unitDurationCost: number;
  vehicleProfileType: VehicleProfileTypeEnum;
  isVehicleAvailable?: boolean;
  maxpallet?: number;
  zone?: string;
  maxTrip?: number;
  loadingDuration?: string;
  createdAt: string;
  modifiedAt: string;
  twEarly?: string | number;
  twLate?: string | number;
  width?: number;
  height?: number;
  length?: number;
  capacity?: number;
  volume?: number;
  maxDistance?: number;
  maxDuration?: number;
}

export const DEFAULT_MAX_TRIP = 1;

export const DEFAULT_VEHICLE_TYPE_MAX_TRIP = DEFAULT_MAX_TRIP;

export const SYSTEM_MAX_TRIP = 10;

export const DEFAULT_LOADING_DURATION = '00:30';

export type VehicleTypeMultiTrip = Pick<
  VehicleType,
  'maxTrip' | 'loadingDuration'
>;

export interface MultiTripSystemDefaults {
  defaultMaxTrip: number;
  systemMaxTrip: number;
  defaultLoadingDuration: string;
}

export enum AccessTypeEnum {
  FRONT = "FRONT",
  REAR = "REAR",
  LEFT = "LEFT",
  RIGHT = "RIGHT",
  TOP = "TOP",
  BOTTOM = "BOTTOM",
}

export enum VehicleProfileTypeEnum {
  CAR = "CAR",
  TRUCK = "TRUCK",
}

export const VehicleEnumConfigs = [
  {
    type: "VehicleProfileTypeEnum",
    property: "vehicleProfileTypeOptions",
    errorMessage: "Failed to fetch vehicle profile types",
  },
  {
    type: "AccessTypeEnum",
    property: "accessPointOptions",
    errorMessage: "Failed to fetch access types",
  },
];

export interface VehicleInput {
  licensePlates: string[];
  startDepotId: string;
  endDepotId: string;
  vehicleTypeId: string;
}


export interface VehicleCreateInput {
  licensePlates: string[];
  startDepotId: string;
  endDepotId: string;
  vehicleTypeId: string;
}

export interface VehicleUpdateInput {
  licensePlate: string;
  startDepotId: string;
  endDepotId: string;
  vehicleTypeId: string;
  isActive?: boolean;
}

export interface VehicleCreationResult {
  vehicles: Vehicle[];
  duplicates: string[];
  message: string;
}

export interface VehicleCreateResponse {
  vehicles: Vehicle[];
  duplicates: string[];
  message: string;
}

export type VehicleUpdateResponse = MyVehicles;

export interface VehicleEnumOption {
  key: string;
  value: string;
}

export interface TimeObject {
  hour: number;
  minute: number;
}

export interface VehicleValidationInput {
  vehicleTypeId: string;
  vehicleId?: string[];
  numberOfVehiclesAvailable?: number;
}


export interface VehicleBlobData {
  vehicleTypeId: string;
  numberOfVehiclesAvailable?: number;
  specificVehicleIds?: string[];
}

export interface BreakTimeObject {
  duration: TimeObject;
  timeWindowEarly: TimeObject;
  timeWindowLate: TimeObject;
}

export interface LicensePlateItem {
  vehicleId: string;
  licensePlate: string;
  isSelected: boolean;
  startDepotName: string;
  endDepotName: string;
}

export interface LicensePlateSelectionResult {
  vehicleTypeId: string;
  selectedLicensePlates: string[];
  selectedVehicleIds: string[];
}

export type OpenVrpEndOfRoute = 'return' | 'no_return';

export type OpenVrpSelectionMode = 'count' | 'license-plate';

export interface OpenVrpRunVehicleEntry {
  id: number;
  vehicleTypeId: string;
  vehicleTypeName: string;
  mode: OpenVrpSelectionMode;
  count: number;
  licensePlates: string[];
  vehicleIds: string[];
  endOfRoute: OpenVrpEndOfRoute;
  startDepotId: string;
  startDepotName: string;
  endDepotId: string | null;
  endDepotName: string | null;
  maxTrip: number;
  loadingDuration: string | null;
}

export interface OpenVrpRunVehicleGroup {
  vehicleTypeId: string;
  vehicleTypeName: string;
  /** Vehicles across every row of this type. */
  total: number;
  entries: OpenVrpRunVehicleEntry[];
}

export interface OpenVrpPoolBuilder {
  mode: OpenVrpSelectionMode;
  count: number;
  endOfRoute: OpenVrpEndOfRoute;
  chosenVehicleIds: string[];
  /** null follows the depot in scope */
  startDepotId: string | null;
  /** null follows the start depot */
  endDepotId: string | null;
  maxTrip: number;
  loadingDuration: string | null;
}

export type OpenVrpPresetEntry = Omit<
  OpenVrpRunVehicleEntry,
  'id' | 'maxTrip' | 'loadingDuration'
> &
  Partial<Pick<OpenVrpRunVehicleEntry, 'maxTrip' | 'loadingDuration'>>;

export interface OpenVrpVehiclePreset {
  id: string;
  name: string;
  depotId: string;
  depotName: string;
  createdAt: string;
  entries: OpenVrpPresetEntry[];
}

/** The figures one summary block shows, for a depot or for the whole fleet. */
export interface OpenVrpRunSummaryTotals {
  total: number;
  returnCount: number;
  noReturnCount: number;
  multiTripCount: number;
  plannedTrips: number;
}

export interface OpenVrpDepotSummary {
  depotId: string;
  depotName: string;
  /** Sample data standing in for a depot the API does not report yet. */
  isMock: boolean;
  totals: OpenVrpRunSummaryTotals;
}

export interface OpenVrpDepotRunList {
  depotId: string;
  depotName: string;
  entries: OpenVrpRunVehicleEntry[];
}

export interface MockRunGroup {
  count: number;
  endOfRoute: OpenVrpEndOfRoute;
  maxTrip: number;
}
