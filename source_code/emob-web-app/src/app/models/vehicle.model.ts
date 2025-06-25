export interface Vehicle {
  availableCar: number;
  limitVehicleCapacity: number;
  deliveryTime: string;
  backToDepotTime: string;
  maxTravelDistance: number;
  MaxWorkDuration: number;
}

export interface myVehicles {
  companyName: string;
  licensePlate: string;
  vehicleName: string;
  vehicleType: string;
  vehicleBrand: string | null;
  vehicleModel: string;
  vehicleWeight: number;
  maxLoadWeight: number;
  cargoWidth: number;
  cargoLength: number;
  cargoHeight: number;
  maxPalletCount: number;
  isActive: boolean;
  createdAt: string;
  modifiedAt: string;
}
