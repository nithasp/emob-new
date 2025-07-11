export interface Vehicle {
  availableCar: number;
  limitVehicleCapacity: number;
  deliveryTime: string;
  backToDepotTime: string;
  maxTravelDistance: number;
  MaxWorkDuration: number;
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
  access: string[];
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