export interface LocalizedText {
  th_TH: string;
  en_US: string;
}

export interface JoiConfig {
  type: 'string' | 'number';
  required: boolean;
  pattern?: string | undefined;
  min?: number | undefined;
  max?: number | undefined;
  message: string;
}

export type ParameterValue = string | number | null;

export interface DynamicParameter {
  companyName: string;
  id: string;
  category: LocalizedText;
  depotId: string | null;
  keyName: string;
  displayName: LocalizedText;
  valueType: string;
  value: ParameterValue;
  joiConfig: JoiConfig;
  isRequired: boolean;
  defaultValue: string | null;
  description: LocalizedText;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewDynamicParameter {
  companyId: string;
  depotId: string | null;
  category: LocalizedText;
  keyName: string;
  displayName: LocalizedText;
  valueType: string;
  value: string | null;
  joiConfig: JoiConfig;
  isRequired: boolean;
  defaultValue: string | null;
  description: LocalizedText;
  sortOrder: number;
}

export interface DynamicParameterUpdateItem {
  id: string;
  value: string | number;
}

export interface DynamicParameterUpdateError {
  id: string;
  message: string;
}

export interface DynamicParameterUpdateResult {
  success: boolean;
  updatedCount: number;
  errors: DynamicParameterUpdateError[];
  results: DynamicParameter[];
}

export interface Constraint {
  earlyDeliveryTime?: string | undefined;
  backToDepotTime?: string | undefined;
  maximumWorkDuration?: string | undefined;
  numberOfVehicleAvailable?: number | undefined;
  vehicleOrderSizeCapacity?: number | undefined;
  maximumTravelDistance?: number | undefined;
  serviceDurationTime?: string | undefined;
  minimumVehicle?: number | undefined;
  [key: string]: string | number | undefined;
}
