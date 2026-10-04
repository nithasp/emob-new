export const INPUT_KEYS = {
  preorder: 'preorder',
  timeWindow: 'time_window',
} as const;

export const PREORDER_COLUMNS = [
  'ORDERID_ORG',
  'CUSTOMER_NAME',
  'TEL',
  'CHANNEL',
  'ADDRESS',
  'TUMBOL',
  'AUMPHER',
  'PROVINCE',
  'ZIPCODE',
  'LatLng',
  'PRODUCTID',
  'PRODUCTNAME',
  'QUANTITYMAIN',
];

export const TIME_WINDOW_COLUMNS = ['ORDERID_ORG', 'TIME_WINDOW_EARLY', 'TIME_WINDOW_LATE'];

export const PRODUCT_MASTER_NAME = 'Product Master';
export const PRODUCT_MASTER_COLUMNS = [
  'PRODUCTID',
  'SKU_CODE',
  'PRODUCTNAME',
  'PACKAGING_TYPE',
  'WEIGHT_KG',
  'VOLUME_M3',
];

export const CUSTOMER_MASTER_NAME = 'Customer Master';
export const CUSTOMER_MASTER_COLUMNS = [
  'CUSTOMER_ID',
  'CUSTOMER_NAME',
  'CHANNEL',
  'ADDRESS',
  'TUMBOL',
  'AUMPHER',
  'PROVINCE',
  'ZIPCODE',
  'LatLng',
];

export const ACTUAL_LOCATION_NAME = 'Actual Location';
export const ACTUAL_LOCATION_COLUMNS = ['ORDERID_ORG', 'CUSTOMER_NAME', 'DELIVERED_AT', 'LatLng', 'DRIVER'];
