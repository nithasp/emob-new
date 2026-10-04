import { Depot } from './company.types';

export const ACCESS_TYPES = ['FRONT', 'REAR', 'LEFT', 'RIGHT', 'TOP', 'BOTTOM'] as const;
export const VEHICLE_PROFILE_TYPES = ['CAR', 'TRUCK'] as const;

export type AccessType = (typeof ACCESS_TYPES)[number];
export type VehicleProfileType = (typeof VEHICLE_PROFILE_TYPES)[number];

export interface VehicleBreak {
  name: string;
  duration: string;
  timeWindowEarly: string;
  timeWindowLate: string;
}

export interface Dimension {
  width: number | null;
  height: number | null;
  depth: number | null;
}

export interface VehicleType {
  vehicleTypeId: string;
  name: string;
  access: AccessType[];
  allowedBreaks: VehicleBreak[];
  dimension: Dimension | null;
  maximumWeightCapacity: number | null;
  maximumVolumeCapacity: number | null;
  timeWindowEarly: string | null;
  timeWindowLate: string | null;
  maximumDistance: number | null;
  maximumDuration: string | null;
  vehicleGroupId: string | null;
  fixedCost: number | null;
  unitDistanceCost: number | null;
  unitDurationCost: number | null;
  vehicleProfileType: VehicleProfileType;
  isVehicleAvailable: boolean;
  maxpallet: number | null;
  zone: string | null;
  maxTrip: number | null;
  loadingDuration: string | null;
  createdAt: Date;
  modifiedAt: Date;
}

export interface VehicleTypeFormValues {
  name: string;
  access: AccessType[];
  allowedBreaks: VehicleBreak[];
  dimension: Dimension | null;
  maximumWeightCapacity: number | null;
  maximumVolumeCapacity: number | null;
  timeWindowEarly: string | null;
  timeWindowLate: string | null;
  maximumDistance: number | null;
  maximumDuration: string | null;
  vehicleGroupId: string | null;
  fixedCost: number | null;
  unitDistanceCost: number | null;
  unitDurationCost: number | null;
  vehicleProfileType: VehicleProfileType;
  maxpallet: number | null;
  zone: string | null;
}

export interface VehicleTypeOptionalValues {
  isVehicleAvailable?: boolean | undefined;
  maxTrip?: number | null | undefined;
  loadingDuration?: string | null | undefined;
}

export type VehicleTypeWrite = VehicleTypeFormValues & VehicleTypeOptionalValues;

export interface Vehicle {
  companyName: string;
  vehicleId: string;
  licensePlate: string;
  startDepotId: Depot;
  endDepotId: Depot;
  vehicleTypeId: string;
  vehicleType: VehicleType;
  isActive: boolean;
  createdAt: Date;
  modifiedAt: Date;
}

export interface VehicleRow {
  vehicleId: string;
  licensePlate: string;
  startDepotId: string;
  endDepotId: string;
  vehicleTypeId: string;
  isActive: boolean;
  createdAt: Date;
  modifiedAt: Date;
}

export interface VehicleFilters {
  depotId?: string | undefined;
  vehicleTypeId?: string | undefined;
}

export interface NewVehicles {
  licensePlates: string[];
  startDepotId: string;
  endDepotId: string;
  vehicleTypeId: string;
}

export interface NewVehicle {
  licensePlate: string;
  startDepotId: string;
  endDepotId: string;
  vehicleTypeId: string;
}

export interface VehicleReferences {
  startDepotId?: string | undefined;
  endDepotId?: string | undefined;
  vehicleTypeId?: string | undefined;
}

export interface VehicleUpdate {
  licensePlate?: string | undefined;
  startDepotId?: string | undefined;
  endDepotId?: string | undefined;
  vehicleTypeId?: string | undefined;
  isActive?: boolean | undefined;
}

export interface VehicleCreationResult {
  vehicles: Vehicle[];
  duplicates: string[];
  message: string;
}

export interface EnumOption {
  key: string;
  value: string;
}
