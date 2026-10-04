import { Depot } from './company.types';

export const ACTUAL_CATEGORY = 'actual';

export interface ConfigurationRow {
  id: string;
  depotId: string;
  name: string;
  category: string;
  type: string;
  fileBlobPath: string;
  columns: string[];
  replace: boolean;
  timestamp: Date;
}

export interface Configuration extends ConfigurationRow {
  companyName: string;
  depot: Depot | null;
  fileUrl: { fileConfigurationUrl: string | null };
}

export interface NewConfiguration {
  companyId: string;
  depotId: string;
  name: string;
  category: string;
  type: string;
  fileBlobPath: string;
  columns: string[];
  replace: boolean;
  timestamp?: Date | undefined;
}

export interface ActualLocationFile {
  fileName: string;
  fileBlobPath: string;
  timestamp: Date;
  fileUrl: { fileActualLocationUrl: string | null };
}

export interface ActualLocationMonth {
  month: string;
  children: ActualLocationFile[];
}

export interface ActualLocation {
  year: string;
  children: ActualLocationMonth[];
}
