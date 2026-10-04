import { inject, Injectable } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { Subject } from 'rxjs';
import { LoggerService } from '@core/services/logger.service';
import { Experiment } from '../../models/experiment.model';
import {
  RouteInfo,
  FeatureCollection,
  GeoJSONFeature,
  ReportDataItem,
  RoutingNode,
  RouteMetric,
  VrpSolutionData,
  VrpGeoJsonData,
} from '../../models/location.model';
import { ExperimentFileService } from '../../services/experiment-file.service';

@Injectable()
export class ResultPlanService {
  private readonly logger = inject(LoggerService);

  // data store
  experiment?: Experiment;
  isLoading: boolean = true;
  // API-fetched plan data
  private vrpStatsData: Record<string, unknown> = {};
  vrpSolutionData: VrpSolutionData = {};
  geoJsonRawData: VrpGeoJsonData = {};
  // VRP routing nodes for data lookup
  routingNodes: RoutingNode[] = [];
  routingNodesMap: Record<number, RoutingNode> = {};
  routingNodesByIdMap: Record<string, RoutingNode> = {};
  headersReport: string[] = [];
  dataSourceReport: ReportDataItem[] = [];
  vrpDashboardCards: {
    label: string;
    value: string | number;
    isFeasible?: boolean;
  }[] = [];
  vrpDashboardRows: {
    index: number;
    metric: string;
    totalValue: number | null;
    excessValue: number | null;
    unit: string;
    statusOk: boolean | null;
  }[] = [];
  dataRouteInfo = new MatTableDataSource<RouteInfo>([]);
  routeInfoDetails: RouteInfo | null = null;

  // The page used to do this work itself, in one flow. These mark the two points of that flow
  // where the route table and the filter take over, so both still happen at the same moment.
  readonly routesBuilt$ = new Subject<void>();
  readonly planLoaded$ = new Subject<void>();

  constructor(private readonly experimentFiles: ExperimentFileService) {}

  async loadPlanData(response: Experiment): Promise<void> {
    const planUrls = response.fileUrls?.plan;

    const [vrpStats, vrpSolution, geoJson] = await Promise.all([
      planUrls?.vrpStats
        ? this.experimentFiles.dataFromFileUrlToJson(planUrls.vrpStats)
        : Promise.resolve({}),
      planUrls?.vrpSolutionLean
        ? this.experimentFiles.dataFromFileUrlToJson(planUrls.vrpSolutionLean)
        : Promise.resolve({}),
      planUrls?.geoJson
        ? this.experimentFiles.dataFromFileUrlToJson(planUrls.geoJson)
        : Promise.resolve({}),
    ]);

    this.vrpStatsData = vrpStats as Record<string, unknown>;
    this.vrpSolutionData = vrpSolution as VrpSolutionData;
    this.geoJsonRawData = geoJson as VrpGeoJsonData;

    this.logger.log('vrpStats', this.vrpStatsData);
  }

  initRoutingNodes(): void {
    const vrpData = this.vrpSolutionData?.vrpData;
    this.routingNodes = vrpData?.routingNodes ?? [];
    this.routingNodes.forEach((node: RoutingNode) => {
      if (node?.index != null) this.routingNodesMap[node.index] = node;
      if (node?.nodeId) this.routingNodesByIdMap[node.nodeId] = node;
    });
  }

  buildVrpStatsReport(): void {
    this.headersReport = ['property', 'value'];

    const stats = this.vrpStatsData;
    const rows: ReportDataItem[] = [];

    const propertyOrder = [
      'customerCount',
      'routeCount',
      'feasibleRouteCount',
      'infeasibleRouteCount',
      'isSolutionFeasible',
      'totalFitness',
      'totalCost',
      'totalWeight',
      'totalVolume',
      'totalDistance',
      'totalDuration',
      'totalTravelDuration',
      'totalServiceDuration',
      'totalBreakDuration',
      'excessWeight',
      'excessVolume',
      'excessDistance',
      'excessDuration',
      'excessEarlyTime',
      'excessLateTime',
      'hasExcessWeight',
      'hasExcessVolume',
      'hasExcessDistance',
      'hasExcessDuration',
      'hasExcessEarlyTime',
      'hasExcessLateTime',
      'hasIncorrectOrder',
    ];

    for (const key of propertyOrder) {
      const value = stats[key];
      let displayValue: string | number;

      if (typeof value === 'boolean') {
        displayValue = value ? 'Yes' : 'No';
      } else if (typeof value === 'number') {
        displayValue = value;
      } else {
        displayValue = String(value ?? '');
      }

      rows.push({ property: key, value: displayValue } as ReportDataItem);
    }

    if (stats['dataUnits'] && typeof stats['dataUnits'] === 'object') {
      const units = stats['dataUnits'] as Record<string, string>;
      for (const [unitKey, unitValue] of Object.entries(units)) {
        rows.push({ property: unitKey, value: unitValue } as ReportDataItem);
      }
    }

    if (Array.isArray(stats['unassignedCustomers'])) {
      rows.push({
        property: 'unassignedCustomers',
        value: (stats['unassignedCustomers'] as unknown[]).length,
      } as ReportDataItem);
    }

    this.dataSourceReport = rows;
    this.buildVrpStatsDashboard();
  }

  private buildVrpStatsDashboard(): void {
    const s = this.vrpStatsData;
    const units = (s['dataUnits'] ?? {}) as Record<string, string>;

    this.vrpDashboardCards = [
      {
        label: 'isSolutionFeasible',
        value: s['isSolutionFeasible'] ? 'True' : 'False',
        isFeasible: s['isSolutionFeasible'] as boolean,
      },
      { label: 'customerCount', value: s['customerCount'] as number },
      { label: 'routeCount', value: s['routeCount'] as number },
      { label: 'totalFitness', value: s['totalFitness'] as number },
      { label: 'totalCost', value: s['totalCost'] as number },
    ];

    this.vrpDashboardRows = [
      {
        index: 1,
        metric: 'totalWeight',
        totalValue: s['totalWeight'] as number,
        excessValue: s['excessWeight'] as number,
        unit: units['weightUnit'] ?? '',
        statusOk: !(s['hasExcessWeight'] as boolean),
      },
      {
        index: 2,
        metric: 'totalVolume',
        totalValue: s['totalVolume'] as number,
        excessValue: s['excessVolume'] as number,
        unit: units['volumeUnit'] ?? '',
        statusOk: !(s['hasExcessVolume'] as boolean),
      },
      {
        index: 3,
        metric: 'totalDistance',
        totalValue: s['totalDistance'] as number,
        excessValue: s['excessDistance'] as number,
        unit: units['distanceUnit'] ?? '',
        statusOk: !(s['hasExcessDistance'] as boolean),
      },
      {
        index: 4,
        metric: 'totalDuration',
        totalValue: s['totalDuration'] as number,
        excessValue: s['excessDuration'] as number,
        unit: units['timeUnit'] ?? '',
        statusOk: !(s['hasExcessDuration'] as boolean),
      },
      {
        index: 5,
        metric: 'totalTravelDuration',
        totalValue: s['totalTravelDuration'] as number,
        excessValue: null,
        unit: units['timeUnit'] ?? '',
        statusOk: null,
      },
      {
        index: 6,
        metric: 'totalServiceDuration',
        totalValue: s['totalServiceDuration'] as number,
        excessValue: null,
        unit: units['timeUnit'] ?? '',
        statusOk: null,
      },
      {
        index: 7,
        metric: 'totalBreakDuration',
        totalValue: s['totalBreakDuration'] as number,
        excessValue: null,
        unit: units['timeUnit'] ?? '',
        statusOk: null,
      },
      {
        index: 8,
        metric: 'excessEarlyTime',
        totalValue: null,
        excessValue: s['excessEarlyTime'] as number,
        unit: units['timeUnit'] ?? '',
        statusOk: !(s['hasExcessEarlyTime'] as boolean),
      },
      {
        index: 9,
        metric: 'excessLateTime',
        totalValue: null,
        excessValue: s['excessLateTime'] as number,
        unit: units['timeUnit'] ?? '',
        statusOk: !(s['hasExcessLateTime'] as boolean),
      },
    ];
  }

  private buildRouteDistancesMap(): Record<number, number[]> {
    const distancesMap: Record<number, number[]> = {};
    const geoJson = this.geoJsonRawData;
    geoJson.routes?.forEach((route: FeatureCollection) => {
      route.features?.forEach((feature: GeoJSONFeature) => {
        if (
          feature.geometry?.type === 'LineString' &&
          feature.properties?.distances
        ) {
          const routeIdx = feature.properties.routeIndex ?? 0;
          distancesMap[routeIdx] = feature.properties.distances;
        }
      });
    });
    return distancesMap;
  }

  buildRouteInfoFromVrpSolution(): void {
    const routeMetrics =
      this.vrpSolutionData?.solutionMetrics?.routeMetrics ?? [];
    const routeDistancesMap = this.buildRouteDistancesMap();

    routeMetrics.forEach((route: RouteMetric) => {
      const customerNodes = route.routeNodes?.slice(1, -1) ?? [];
      const zones = [
        ...new Set(
          customerNodes
            .map((idx: number) => this.routingNodesMap[idx]?.zone)
            .filter((z: string | undefined): z is string => !!z)
        ),
      ];

      const routeIndex = route.routeIndex ?? 0;

      this.dataRouteInfo.data.push({
        routeLabel: route.routeLabel ?? 0,
        routeIndex: routeIndex,
        route: route.routeNodes ?? [],
        routeDistances: routeDistancesMap[routeIndex] ?? [],
        numberDeliveryPoints: route.customerCount ?? 0,
        weight: route.routeWeight ?? 0,
        utilize: 0,
        travelDistance: route.routeDistance ?? 0,
        totalDuration: route.routeDuration ?? 0,
        travelDuration: route.routeTravelDuration ?? 0,
        serviceTime: route.routeServiceDuration ?? 0,
        depot2firstDistance: 0,
        last2depotDistance: 0,
        totalCustomersDistance: 0,
        averageCustomersDistance: 0,
        maxCustomersDistance: 0,
        customersDistance: [],
        numberZone: zones.length,
        zone: zones,
        numberOfValidateTypes: '',
        numberOfReplaceTypes: '',
      } as unknown as RouteInfo);
    });

    this.routesBuilt$.next();
  }
}
