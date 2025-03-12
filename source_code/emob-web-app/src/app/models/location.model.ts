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