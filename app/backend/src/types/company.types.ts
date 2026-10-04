export const DEPOT_TYPES = ['Single', 'Multi'] as const;

export type DepotType = (typeof DEPOT_TYPES)[number];

export interface Company {
  id: string;
  companyName: string;
  depotType: DepotType;
}

export interface DepotInputData {
  companyName: string;
  depotId: string;
  keyName: string;
  displayName: string;
  columnRequired: string[];
  fileFormatType: string;
  required: boolean;
  createdAt: Date;
  modifiedAt: Date;
}

export interface Depot {
  companyName: string;
  depotId: string;
  depotName: string;
  latitude: number;
  longitude: number;
  timeWindowEarly: string;
  timeWindowLate: string;
  createdAt: Date;
  updatedAt: Date;
  inputdata: DepotInputData[];
}

export interface NewDepot {
  companyId: string;
  depotName: string;
  latitude: number;
  longitude: number;
  timeWindowEarly: string;
  timeWindowLate: string;
  sortOrder: number;
}

export interface NewDepotInputData {
  depotId: string;
  keyName: string;
  displayName: string;
  columnRequired: string[];
  fileFormatType: string;
  required: boolean;
  sortOrder: number;
}
