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

export interface JoiConfig {
  pattern?: Record<string, any>;
  min?: number;
  max?: number;
  message: string;
}

export interface DynamicParameter {
  companyName: string;
  id: string;
  category: string;
  keyName: string;
  displayName: string;
  valueType: string;
  value: string | number;
  joiConfig: JoiConfig;
  isRequired: boolean;
  defaultValue: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface DynamicParameterUpdateInput {
  companyName?: string;
  category?: string;
  keyName?: string;
  displayName?: string;
  valueType?: string;
  value?: string | number;
  joiConfig?: JoiConfig;
  isRequired?: boolean;
  defaultValue?: string;
  description?: string;
}

export interface DeleteDynamicParameter {
  success: boolean;
}