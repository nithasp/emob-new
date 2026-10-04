import { JoiConfig, LocalizedText } from './parameter.types';
import { CellValue } from './pipeline.types';
import { VehicleTypeWrite } from './vehicle.types';

export interface SeedDepot {
  key: 'bangna' | 'rangsit' | 'nonthaburi';
  depotName: string;
  latitude: number;
  longitude: number;
  timeWindowEarly: string;
  timeWindowLate: string;
  serviceRadiusKm: number;
}

export interface SeedProduct {
  productId: string;
  skuCode: string;
  name: string;
  packagingType: string;
  weightKg: number;
  volumeM3: number;
}

export interface SeedVehicleType {
  key: 'pickup' | 'box' | 'sixWheel' | 'tenWheel' | 'evVan' | 'evTruck';
  type: VehicleTypeWrite;
  licensePlates: string[];
}

export interface SeedParameter {
  category: LocalizedText;
  keyName: string;
  displayName: LocalizedText;
  valueType: string;
  value: string;
  joiConfig: JoiConfig;
  description: LocalizedText;
}

export interface OrderOptions {
  seed: number;
  depot: SeedDepot;
  orderCount: number;
  orderPrefix: string;
  missingCoordinateShare?: number;
  mismatchedCoordinates?: number;
  unknownAreas?: number;
  unlistedProductOrders?: number;
}

export interface GeneratedOrders {
  rows: CellValue[][];
  orderIds: string[];
  workbook: () => Promise<Buffer>;
  timeWindows: () => Buffer;
}

export interface Area {
  province: string;
  district: string;
  subdistrict: string;
  zip: number;
  latitude: number;
  longitude: number;
}

export type DepotKey = SeedDepot['key'];
export type TypeKey = SeedVehicleType['key'];
export type Owner = 'demo' | 'somchai' | 'nattaya';

export interface SeededVehicleType {
  vehicleTypeId: string;
  vehicleIds: string[];
}

export interface Scenario {
  name: string;
  depot: DepotKey;
  owner: Owner;
  ageHours: number;
  orders: Omit<OrderOptions, 'depot' | 'orderPrefix'>;
  orderPrefix: string;
  stage: 'uploaded' | 'validated' | 'Succeeded' | 'Failed' | 'Cancelled';
  fleet: Array<{ type: TypeKey; count?: number; plates?: number }>;
  solveSeconds?: number;
  rerun?: { name: string; ageHours: number; solveSeconds: number; fleet: Scenario['fleet'] };
}

export interface SeedConfiguration {
  name: string;
  category: string;
  columns: string[];
  replace: boolean;
  timestamp?: Date;
}
