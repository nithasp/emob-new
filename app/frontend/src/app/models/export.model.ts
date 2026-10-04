export type CsvValue = string | number | boolean | null | undefined | Date;

export interface ExportableData {
  [key: string]: CsvValue;
}
