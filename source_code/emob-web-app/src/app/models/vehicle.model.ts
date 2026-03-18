import { DepotInputRequirement } from "./experiment.model";

export interface Vehicle {
  companyName: string;
  vehicleId: string;
  licensePlate: string;
  startDepotId: string;
  endDepotId: string;
  vehicleType: any;
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
  maximumDuration: number;
  vehicleGroupId?: string;
  fixedCost: number;
  unitDistanceCost: number;
  unitDurationCost: number;
  vehicleProfileType: VehicleProfileTypeEnum;
  isVehicleAvailable?: boolean;
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


export interface VehicleTypePayload extends Partial<VehicleType> {
  maximumVolumeCapacity?: number;
  vehicleGroupId?: string;
  allowedBreaks?: Break[];
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