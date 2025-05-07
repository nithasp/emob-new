export interface Constraint {
  MaxWorkDuration: number;
  maxTravelDistance: number;
  deliveryTime: string;
  limitVehicleCapacity: number;
  availableCar: number;
  earlyDeliveryTime: string;
  backToDepotTime: string;
  maximumWorkDuration: string;
  numberOfVehicleAvailable: number;
  vehicleOrderSizeCapacity: number;
  maximumTravelDistance: number;
  serviceDurationTime: string;
}
export type TimingAndCapacity = Pick<
  Constraint,
  | 'earlyDeliveryTime'
  | 'backToDepotTime'
  | 'maximumWorkDuration'
  | 'numberOfVehicleAvailable'
  | 'vehicleOrderSizeCapacity'
  | 'maximumTravelDistance'
  | 'serviceDurationTime'
>;
