/**
 * The result component consumes these plan payloads through `any`-typed fields
 * (`vrpSolutionData`, `geoJsonRawData`, `routingNodesMap`), so its spec
 * describes them with the shapes below rather than the shared models.
 */
export interface SpecRoutingNode {
  index: number;
  nodeId: string;
  isDepot: boolean;
  name: string;
  latitude: number;
  longitude: number;
  zone?: string;
  deliveryWeight?: number;
  originalAddress?: {
    address: string;
    district: string;
    province: string;
    postalCode: string;
  };
  additionalProperties?: { channel?: string; telephone?: string };
}

export interface SpecRouteMetric {
  routeIndex: number;
  routeLabel: number;
  routeNodes: number[];
  customerCount: number;
  routeWeight: number;
  routeDistance: number;
  routeDuration: number;
  routeTravelDuration: number;
  routeServiceDuration: number;
}

export interface SpecVrpSolutionData {
  vrpData: { routingNodes: SpecRoutingNode[] };
  solutionMetrics: { routeMetrics: SpecRouteMetric[] };
}

export interface SpecGeoJsonFeature {
  type: string;
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: number[] | number[][] };
}

export interface SpecVrpGeoJsonData {
  routes: Array<{ type: string; features: SpecGeoJsonFeature[] }>;
  depots: SpecGeoJsonFeature[];
}
