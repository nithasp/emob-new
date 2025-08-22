export interface Vehicle {
  availableCar: number;
  limitVehicleCapacity: number;
  deliveryTime: string;
  backToDepotTime: string;
  maxTravelDistance: number;
  MaxWorkDuration: number;
}

export interface Depot {
  depotId: string;
  depotName: string;
  latitude: number;
  longitude: number;
  tw_early: string;
  tw_late: string;
  columns: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MyVehicles {
  companyName: string;
  vehicleIds: string;
  licensePlate: string;
  startDepotId: string;
  endDepotId: string;
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
  access: AccessType[];
  capacity: number;
  volume: number;
  twEarly: number;
  twLate: number;
  maxDistance: number;
  maxDuration: number;
  fixedCost: number;
  unitDistanceCost: number;
  unitDurationCost: number;
  vehicleProfileType: string;
  createdAt: string;
  modifiedAt: string;
}

export enum AccessType {
  FRONT = "FRONT",
  REAR = "REAR",
  LEFT = "LEFT",
  RIGHT = "RIGHT",
  TOP = "TOP",
  BOTTOM = "BOTTOM",
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

export interface VehicleEnumOption {
  key: string;
  value: string;
}

export interface TimeObject {
  hour: number;
  minute: number;
}