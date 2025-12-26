export interface Vehicle {
    availableCar:number,
    limitVehicleCapacity:number,
    deliveryTime:string,
    backToDepotTime:string,
    maxTravelDistance:number,
    MaxWorkDuration:number
}

export interface VehicleValidationInput {
  vehicleTypeId: string;
  vehicleId?: string[];
  numberOfVehiclesAvailable?: number;
}