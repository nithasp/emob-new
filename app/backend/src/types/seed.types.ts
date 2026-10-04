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
  /** Customers are drawn from districts within this distance of the depot. */
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
  /** Share of orders that arrive without a coordinate and have to be placed from the address. */
  missingCoordinateShare?: number;
  /** Orders whose coordinate disagrees with the address they name. */
  mismatchedCoordinates?: number;
  /** Orders that name an area the gazetteer does not know, and carry no coordinate. */
  unknownAreas?: number;
  /** Orders that include a product the product master does not list. */
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
  /** How far the run got: only uploaded, validated and waiting, or submitted with that outcome. */
  stage: 'uploaded' | 'validated' | 'Succeeded' | 'Failed' | 'Cancelled';
  /** Vehicles by count, or the first n registered plates of a type. */
  fleet: Array<{ type: TypeKey; count?: number; plates?: number }>;
  solveSeconds?: number;
  /** A second run of the same group: a copy of this one that was run again and succeeded. */
  rerun?: { name: string; ageHours: number; solveSeconds: number; fleet: Scenario['fleet'] };
}
