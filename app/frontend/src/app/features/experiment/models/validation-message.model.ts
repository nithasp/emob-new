export interface ValidateMessage {
    filtersMessage: FiltersMessage;
    warningMessage: WarningMessage;
}

export interface FiltersMessage {
    constraints: Constraints;
    orderData:   OrderData;
}

export interface Constraints {
    overWeight:   ZeroWeight;
    overDistance: ZeroWeight;
}

export interface ZeroWeight {
    title:   string;
    message: string;
}

export interface OrderData {
    invalidCoordinate: ZeroWeight;
}

export interface WarningMessage {
    zeroWeight: ZeroWeight;
}