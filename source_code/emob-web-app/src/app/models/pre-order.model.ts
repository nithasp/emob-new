import type { LocationType } from './location.model';

export interface PreOrder {
  ADDRESS: string;
  AUMPHER: string;
  CHANNEL: string;
  COMPANY_ID: number;
  CUSTOMER_NAME: string;
  CUSTOMER_TYPE: string;
  DELIVERYDATE: Date;
  DELIVERYDATE_CONFIRM: Date;
  DISCOUNT_PROMOTION: number;
  DateConfirm: Date;
  DeliveryStatusCode: number;
  DeliveryStatusName: string;
  LatLng: string;
  ORDERDATE: Date;
  ORDERID: string;
  ORDERID_ORG: string;
  ORDER_ID: number;
  PRODUCTID: number;
  PRODUCTNAME: string;
  PROVICE: string;
  PROVINCE: string;
  QUANTITYMAIN: number;
  QUANTITYMINOR: number;
  REMARK: string;
  SALETYPE: string;
  Status: string;
  TEL: string;
  TOTAL_INCLUDE_VAT: number;
  TUMBOL: string;
  UserConfirm: string;
  ZIPCODE: number;
  created_date: string;
}

export interface CustomerUpdated {
  nodeId: string;
  name: string;
  index: number;
  latitude: number;
  longitude: number;
}

export interface ProductInfo {
  productId: string;
  productName: string;
  quantityMajor: number;
  quantityMinor: number;
  orderId: string | null;
  userConfirm: string | null;
  dateConfirm: string | null;
}

export interface Extra {
  orderId: string | null;
  channel: string | null;
  customerName: string;
  tel: string | null;
  productsInfo: ProductInfo[];
}

export interface Customer {
  deliveryWeight: number | string;
  index: number;
  isDepot: boolean;
  latitude: number;
  longitude: number;
  metrics: Metrics | null;
  name: string;
  nodeId: string;
  originalAddress?: Address;
  pickupWeight: number;
  processedAddress: Address;
  replaceType: ReplaceType;
  required: boolean;
  serviceDuration: number;
  timeWindowEarly: number;
  timeWindowLate: string | number;
  validationType: ValidationType;
  deliveryVolume: number | string;
  pickupVolume: number;
  zone: string;
  extra: Extra;
  label?: number;
  priorityGroup?: number;
  priority?: number;
  prize?: number;
  productQuantity?: any[];
  allowVehicleGroupId?: string[];
  additionalProperties?: any;
}

interface Metrics {
  excessDistance: number;
  excessDuration: number;
  excessVolumn: number;
  excessWeight: number;
  isExcessDistance: boolean;
  isExcessDuration: boolean;
  isExcessVolumn: boolean;
  isExcessWeight: boolean;
  isFeasible: boolean;
  isMissingProduct: boolean;
  missingProductIds: string[];
  productIds: string[];
}

export interface Address {
  address: string;
  district: null | string;
  postalCode: number | null;
  province: string | null;
  subdistrict: null | string;
}

export enum ReplaceType {
  SUBDISTRICT_LEVEL = 'SUB_DISTRICT CENTROID',
  DISTRICT_LEVEL = 'DISTRICT CENTROID',
  PROVINCE_LEVEL = 'PROVINCE CENTROID',
  NO_REPLACE = 'ORIGINAL LOCATION',
  GEOCODE = 'GEOCODE LOCATION',
  INPUT = 'INPUT',
}

export enum ValidationType {
  SUBDISTRICT_LEVEL = 'SUB_DISTRICT LEVEL',
  DISTRICT_LEVEL = 'DISTRICT LEVEL',
  PROVINCE_LEVEL = 'PROVINCE LEVEL',
  NO_VALID = 'NO_VALID',
  NAN_INPUT = 'NAN_INPUT',
  NON_VALIDATED = 'NON_VALIDATED',
}

export const enumDescriptions: { [key: string]: string } = {
  [ReplaceType.SUBDISTRICT_LEVEL]:
    'Uses the centroid point to replace data at the subdistrict level.',
  [ReplaceType.DISTRICT_LEVEL]:
    'Uses the centroid point to replace data at the district level.',
  [ReplaceType.PROVINCE_LEVEL]:
    'Uses the centroid point to replace data at the province level.',
  [ReplaceType.NO_REPLACE]:
    'Indicates that no replacement was performed, retaining the original location.',
  [ReplaceType.INPUT]:
    'Represents the input location itself without any modification.',
  [ValidationType.SUBDISTRICT_LEVEL]:
    'Ensures accuracy of data specifically within subdistrict boundaries.',
  [ValidationType.DISTRICT_LEVEL]:
    'Ensures accuracy of data specifically within district boundaries.',
  [ValidationType.PROVINCE_LEVEL]:
    'Ensures accuracy of data specifically within province boundaries.',
  [ValidationType.NO_VALID]:
    'Indicates that no valid data was available for validation.',
  [ValidationType.NAN_INPUT]:
    'Refers to inputs containing invalid or missing (NaN) values, highlighting issues in data integrity.',
  [ValidationType.NON_VALIDATED]:
    'Specifies that the input has not undergone any validation process.',
};
export function getDescription(
  enumValue: ReplaceType | ValidationType
): string {
  return enumDescriptions[enumValue] || 'No description available';
}
export interface Depot {
  id?: string;
  deliveryWeight: number;
  index: number;
  isDepot: boolean;
  latitude: string | number;
  longitude: string | number;
  name: string;
  nodeId: string;
  originalAddress?: Address;
  pickupWeight: number;
  processedAddress: Address;
  replaceType: ReplaceType;
  required: boolean;
  serviceDuration: number;
  timeWindowEarly: number;
  timeWindowLate: string | number;
  validationType: ValidationType;
  deliveryVolume: number;
  pickupVolume: number;
  zone: string;
  label?: number;
  priorityGroup?: number;
  priority?: number;
  prize?: number;
  productQuantity?: any[];
  allowVehicleGroupId?: string[];
  additionalProperties?: any;
}

export interface GroupedDataPreOrder {
  [ORDERID_ORG: string]: DetailsPreOder;
}

export interface DetailsPreOder {
  ORDERID_ORG: string;
  CHANNEL: string;
  CUSTOMER_NAME: string;
  TEL: string;
  ADDRESS: string;
  AUMPHER: string;
  PROVINCE: string;
  ZIPCODE: number;
  details: PreOrder[];
}

export interface ProductDetail {
  PRODUCTID: string;
  ORDER_ID: string | null;
  PRODUCTNAME: string;
  QUANTITYMAIN: number;
  QUANTITYMINOR: number;
  UserConfirm: string | null;
  DateConfirm: string | null;
}

export interface DataPreOrder {
  ZIPCODE: number | null;
  CUSTOMER_NAME: string;
  ORDERID_ORG: string;
  CHANNEL: string | null;
  TEL: string | null;
  ADDRESS: string;
  AUMPHER: string | null;
  PROVINCE: string | null;
  details: ProductDetail[];
}

export interface DataCustomer {
  ORDERID_ORG: string;
  CHANNEL: string | null;
  CUSTOMER_NAME: string;
  TEL: string | null;
  AUMPHER: string | null;
  PROVINCE: string | null;
  ZIPCODE: number | null;
  ADDRESS: string;
  latitude: number;
  longitude: number;
  validation_type: ValidationType;
  replace_type: ReplaceType;
  details: ProductDetail[];
}

export interface CustomerProduct {
  productId?: string;
  skuCode?: string;
  orderId?: string | null;
  name?: string;
  productName?: string;
  productQuantity?: number;
  quantityMajor?: number;
  quantityMinor?: number;
  userConfirm?: string | null;
  dateConfirm?: string | null;
}

export interface CustomerSelected {
  dataPreOder: DetailsPreOder | DataPreOrder;
  dataCustomer: Customer;
  locationType: LocationType;
}

export interface Location {
  latitude: number;
  longitude: number;
}

export interface FileWithCategory extends File {
  keyName?: string;
  displayName?: string;
  isFirstOfType?: boolean;
  lastModifiedDate?: Date;
}

export type PreOrderFileDescriptor = {
  keyName: string;
  name: string;
  blobPath: string;
  displayName: string;
  type: string;
  size: number;
};

export type PreOrderFileItem = {
  id: string;
  file: FileWithCategory | PreOrderFileDescriptor;
};

export interface DepotInputDataItem {
  keyName: string;
  displayName: string;
  columnRequired: string[];
  required?: boolean;
}

export interface CategoryValidationResult {
  isValid: boolean;
  missingColumns: string[];
  targetDisplayName?: string;
}
