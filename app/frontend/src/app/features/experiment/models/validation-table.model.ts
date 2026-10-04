export type ValidationParams = Record<string, unknown>;

export interface ValidationTableRow {
    fileName: string;
    type: string;
    params: ValidationParams;
}
