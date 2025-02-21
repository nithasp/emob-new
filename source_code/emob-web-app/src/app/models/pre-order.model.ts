export interface PreOrder {    
    ADDRESS: string
    AUMPHER: string
    CHANNEL: string
    COMPANY_ID: number
    CUSTOMER_NAME: string
    CUSTOMER_TYPE: string
    DELIVERYDATE: Date
    DELIVERYDATE_CONFIRM: Date
    DISCOUNT_PROMOTION: number
    DateConfirm: Date
    DeliveryStatusCode: number
    DeliveryStatusName: string
    LatLng: string
    ORDERDATE: Date
    ORDERID: string
    ORDERID_ORG: string
    ORDER_ID: number
    PRODUCTID: number
    PRODUCTNAME: string
    PROVICE: string
    QUANTITYMAIN: number
    QUANTITYMINOR: number
    REMARK: string
    SALETYPE: string
    Status: string
    TEL: string
    TOTAL_INCLUDE_VAT: number
    TUMBOL: string
    UserConfirm: string
    ZIPCODE: number
    created_date: string
  }
  
  export interface UploadPreOrder {
    companyName:                     string;
    runId:                           string;
    name:                            string;
    timestamp:                       Date;
    preOrderBlobPath:                string;
    groupZoneBlobPath:               string;
    productMat1BlobPath:             string;
    productMat7BlobPath:             string;
    parameterBlobPath:               string;
    outputRouteOptimizationBlobPath: string;
    timeStart:                       string;
    timeEnd:                         string;
    timeDuration:                    string;
    triggeredBy:                     string;
    status:                          string;
    run:                             string;
    groupId:                         string;
    countGeocoding:                  string;
    countReroute:                    string;
    result:                          Result;
    fileUrl:                         FileURL;
}

export interface FileURL {
    parameterUrl:                    string;
    preOrderUrl:                     string;
    outputRouteOptimizationBlobPath: string;
}

export interface Result {
    customers: Customer[];
    depots:    Depot[];
}

export interface Customer {
    delivery:          number | string;
    index:             number;
    is_depot:          boolean;
    latitude:          number | string;
    longitude:         number | string;
    name:              string;
    node_id:           string;
    original_address:  Address;
    pickup:            number;
    processed_address: Address;
    replace_type:      ReplaceType;
    required:          boolean;
    service_duration:  number;
    tw_early:          number;
    tw_late:           string;
    validation_type:   ValidationType;
    volumn_delivery:   number | string;
    volumn_pickup:     number;
    zone:              string;
}

export interface Address {
    address:     string;
    district:    null | string;
    postal_code: number | null;
    province:    string | null;
    subdistrict: null | string;
}

export enum ReplaceType {
  OriginalLocation = "ORIGINAL LOCATION",
  SubDistrictCentroid = "SUB_DISTRICT CENTROID",
}

export enum ValidationType {
  DistrictLevel = "DISTRICT LEVEL",
  NoValid = "NO_VALID",
  SubDistrictLevel = "SUB_DISTRICT LEVEL",
}

export interface Depot {
  delivery:          number;
  index:             number;
  is_depot:          boolean;
  latitude:          string;
  longitude:         string;
  name:              string;
  node_id:           string;
  original_address:  Address;
  pickup:            number;
  processed_address: Address;
  replace_type:      ReplaceType;
  required:          boolean;
  service_duration:  number;
  tw_early:          number;
  tw_late:           string;
  validation_type:   ValidationType;
  volumn_delivery:   number;
  volumn_pickup:     number;
  zone:              string;
}