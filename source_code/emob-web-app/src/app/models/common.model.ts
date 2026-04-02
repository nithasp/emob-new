export type ActionMode = 'create' | 'edit' | 'view';

export interface FilterCriteria {
  column: string;
  criteria: string;
  value: string;
}