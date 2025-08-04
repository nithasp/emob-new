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
  node_id: string;
  name: string;
  index: number;
  latitude: number;
  longitude: number;
}

export interface ProductInfo {
  product_id: string;
  product_name: string;
  quantity_major: number;
  quantity_minor: number;
  order_id: string | null;
  user_confirm: string | null;
  date_confirm: string | null;
}

export interface Extra {
  order_id: string | null;
  channel: string | null;
  customer_name: string;
  tel: string | null;
  products_info: ProductInfo[];
}

export interface Customer {
  delivery: number | string;
  index: number;
  is_depot: boolean;
  latitude: number;
  longitude: number;
  metrics: Metrics | null;
  name: string;
  node_id: string;
  original_address: Address;
  pickup: number;
  processed_address: Address;
  replace_type: ReplaceType;
  required: boolean;
  service_duration: number;
  tw_early: number;
  tw_late: string;
  validation_type: ValidationType;
  volumn_delivery: number | string;
  volumn_pickup: number;
  zone: string;
  extra: Extra;
}

interface Metrics {
  excess_distance: number;
  excess_duration: number;
  excess_volumn: number;
  excess_weight: number;
  is_excess_distance: boolean;
  is_excess_duration: boolean;
  is_excess_volumn: boolean;
  is_excess_weight: boolean;
  is_feasible: boolean;
  is_missing_product: boolean;
  missing_product_ids: string[];
  product_ids: string[];
}

export interface Address {
  address: string;
  district: null | string;
  postal_code: number | null;
  province: string | null;
  subdistrict: null | string;
}

export enum ReplaceType {
  SUBDISTRICT_LEVEL = 'SUB_DISTRICT CENTROID',
  DISTRICT_LEVEL = 'DISTRICT CENTROID',
  PROVINCE_LEVEL = 'PROVINCE CENTROID',
  NO_REPLACE = 'ORIGINAL LOCATION',
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
  id: string
  delivery: number;
  index: number;
  is_depot: boolean;
  latitude: string;
  longitude: string;
  name: string;
  node_id: string;
  original_address: Address;
  pickup: number;
  processed_address: Address;
  replace_type: ReplaceType;
  required: boolean;
  service_duration: number;
  tw_early: number;
  tw_late: string;
  validation_type: ValidationType;
  volumn_delivery: number;
  volumn_pickup: number;
  zone: string;
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

export interface Location {
  latitude: number;
  longitude: number;
}

export enum LocationType {
  Edit = 'edit',
  View = 'view',
}
