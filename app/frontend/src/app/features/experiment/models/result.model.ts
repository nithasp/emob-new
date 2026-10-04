export interface RouteFilter {
  column: string;
  criteria: string;
  value: string;
}

export interface VrpDashboardCard {
  label: string;
  value: string | number;
  isFeasible?: boolean;
}

export interface VrpDashboardRow {
  index: number;
  metric: string;
  totalValue: number | null;
  excessValue: number | null;
  unit: string;
  statusOk: boolean | null;
}
