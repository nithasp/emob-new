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

export interface LocalizedText {
  th_TH: string;
  en_US: string;
}

export interface JoiConfig {
  type: string;
  required: boolean;
  pattern?: string;
  min?: number;
  max?: number;
  message: string;
}

export interface DynamicParameter {
  companyName: string;
  id: string;
  category: LocalizedText;
  depotId: string;
  keyName: string;
  displayName: LocalizedText;
  valueType: string;
  value: string | number;
  joiConfig: JoiConfig;
  isRequired: boolean;
  defaultValue: string;
  description: LocalizedText;
  createdAt: string;
  updatedAt: string;
}

export interface DynamicParameterUpdateInput {
  companyName?: string;
  category?: LocalizedText;
  depotId?: string;
  keyName?: string;
  displayName?: LocalizedText;
  valueType?: string;
  value?: string | number;
  joiConfig?: JoiConfig;
  isRequired?: boolean;
  defaultValue?: string;
  description?: LocalizedText;
}

export interface DeleteDynamicParameter {
  success: boolean;
}

export type DynamicParameterValueUpdate = {
  id: string;
  value: string | number;
};

export interface DynamicParameterUpdateError {
  id: string;
  message: string;
}

export interface UpdateDynamicParameter {
  success: boolean;
  updatedCount: number;
  errors: DynamicParameterUpdateError[];
  results: DynamicParameter[];
}
