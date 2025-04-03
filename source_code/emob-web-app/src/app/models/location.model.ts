import Style from "ol/style/Style";
import { Customer } from "./pre-order.model";

export enum LocationType {
    Verify = 'verify',
    Uncertain = 'uncertain',
    Unverify = 'unverify',
    Edit = 'edit'
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
    unverify: boolean,
    uncertain: boolean,
    verify: boolean,
    edit: boolean

}

export interface Location {
    latitude: number, 
    longitude: number
}


export interface RouteInfo {
    average_customers_distance: number;
    customers_distance: string;
    depot2first_distance: number;
    last2depot_distance: number;
    max_customers_distance: number;
    number_delivery_points: number;
    number_of_replace_types: string;
    number_of_validate_types: string;
    number_zone: number;
    route: number[];
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
