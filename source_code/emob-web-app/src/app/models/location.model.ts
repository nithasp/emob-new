import type MapBrowserEvent from 'ol/MapBrowserEvent';
import Style from 'ol/style/Style';
import { FeatureLike } from 'ol/Feature';
import { Customer } from './pre-order.model';

export enum LocationType {
  Verify = 'verify',
  Uncertain = 'uncertain',
  Unverify = 'unverify',
  Edit = 'edit',
}

export interface IconStyle {
  verify: Style;
  uncertain: Style;
  unverify: Style;
  edit: Style;
}
export interface DataGroup {
  verify: {
    customers: Customer[];
    type: LocationType.Verify;
  };
  uncertain: {
    customers: Customer[];
    type: LocationType.Uncertain;
  };
  unverify: {
    customers: Customer[];
    type: LocationType.Unverify;
  };
  edit: {
    customers: Customer[];
    type: LocationType.Edit;
  };
}

export interface DisplayLocationType {
  unverify: boolean;
  uncertain: boolean;
  verify: boolean;
  edit: boolean;
}

export interface Location {
  latitude: number;
  longitude: number;
}

export interface RouteInfo {
  averageCustomersDistance: number;
  customersDistance: number[];
  depot2firstDistance: number;
  last2depotDistance: number;
  maxCustomersDistance: number;
  numberDeliveryPoints: number;
  numberOfReplaceTypes: string;
  numberOfValidateTypes: string;
  numberZone: number;
  nodeId: string;
  nodeIndex: number;
  nodeLabel: number;
  route: number[];
  routeDistances: number[];
  routeLabel: number;
  routeIndex: number;
  serviceTime: number;
  totalCustomersDistance: number;
  totalDuration: number;
  travelDistance: number;
  travelDuration: number;
  utilize: number;
  weight: number;
  zone: string[];
}

export interface FeatureProperties {
  routeIndex?: number;
  routeOrder?: number;
  routeLabel?: number;
  startDepotId?: number;
  endDepotId?: number;
  depotId?: number;
  nodeIndex?: number;
  name?: string;
  weight?: number;
  color?: string;
  isDepot?: boolean;
  features?: FeatureLike[];
  numCustomers?: number;
  distance?: number;
  duration?: number;
  zone?: string | string[];
  customers?: string[];
  serviceDuration?: number;
  travelDuration?: number;
  extra?: {
    channel?: string;
    customerName?: string;
    tel?: string;
    productsInfo?: Array<{
      productId: string;
      orderId: string;
      productName: string;
      quantityMajor: number;
      quantityMinor: number;
      userConfirm: string;
      dateConfirm: string;
    }>;
  };
  originalAddress?: {
    district: string;
    province: string;
    postalCode: string;
    address: string;
  };
}

export interface GeoJSONFeature {
  type: string;
  properties: FeatureProperties;
  geometry: {
    type: string;
    coordinates: number[];
  };
}

export interface FeatureCollection {
  type: string;
  features: GeoJSONFeature[];
  routeIndex?: number;
}

export interface ReportDataItem {
  property: string;
  value: string | number | boolean;
  [key: string]: string | number | boolean;
}

export interface PreOrderDataItem {
  ORDERID: string;
  PROVICE?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface PopupContent {
  [key: string]: string | number | boolean | object | undefined;
}

export type NumberValue = string | number | boolean | object | null | undefined;

export type MapPointerBrowserEvent = MapBrowserEvent<
  PointerEvent | KeyboardEvent | WheelEvent
>;
