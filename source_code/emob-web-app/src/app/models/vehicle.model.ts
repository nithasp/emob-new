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
  tw_early: string;
  tw_late: string;
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

export interface VehicleType {
  vehicleTypeId: string;
  name: string;
  width: number;
  height: number;
  length: number;
  access: AccessTypeEnum[];
  capacity: number;
  volume: number;
  twEarly: number;
  twLate: number;
  maxDistance: number;
  maxDuration: number;
  fixedCost: number;
  unitDistanceCost: number;
  unitDurationCost: number;
  vehicleProfileType: VehicleProfileTypeEnum;
  createdAt: string;
  modifiedAt: string;
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
    type: 'VehicleProfileTypeEnum', 
    property: 'vehicleProfileTypeOptions',
    errorMessage: 'Failed to fetch vehicle profile types'
  },
  { 
    type: 'AccessTypeEnum', 
    property: 'accessPointOptions',
    errorMessage: 'Failed to fetch access types'
  }
];

export interface VehicleInput {
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

export interface VehicleEnumOption {
  key: string;
  value: string;
}

export interface TimeObject {
  hour: number;
  minute: number;
}