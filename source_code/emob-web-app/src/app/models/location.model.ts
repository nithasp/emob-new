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
  average_customers_distance: number;
  customers_distance: number[];
  depot2first_distance: number;
  last2depot_distance: number;
  max_customers_distance: number;
  number_delivery_points: number;
  number_of_replace_types: string;
  number_of_validate_types: string;
  number_zone: number;
  node_id: string;
  node_index: number;
  node_label: number;
  route: number[];
  route_distances: number[];
  route_label: number;
  route_index: number;
  service_time: number;
  total_customers_distance: number;
  total_duration: number;
  travel_distance: number;
  travel_duration: number;
  utilize: number;
  weight: number;
  zone: string[];
}

export interface FeatureProperties {
  route_index?: number;
  route_order?: number;
  route_label?: number;
  start_depot_id?: number;
  end_depot_id?: number;
  depot_id?: number;
  node_index?: number;
  name?: string;
  weight?: number;
  color?: string;
  is_depot?: boolean;
  features?: FeatureLike[];
  num_customers?: number;
  distance?: number;
  duration?: number;
  zone?: string | string[];
  customers?: string[];
  service_duration?: number;
  travel_duration?: number;
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
  route_index?: number;
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
