import Style from "ol/style/Style";
import { Customer } from "./pre-order.model";

export enum LocationType {
    Verify = 'verify',
    Uncertain = 'uncertain',
    Unverify = 'unverify'
}


export interface IconStyle {
    verify: Style;
    uncertain: Style;
    unverify: Style;
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
}