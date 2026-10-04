import { LatLng } from '../../types/geo.types';
import {
  BuiltPlan,
  CellValue,
  CustomerNode,
  GeoJsonFeature,
  RouteGeometry,
  RouteMetric,
  RoutePlan,
  SheetSpec,
  SolverInput,
  SolverRoutingNode,
  VrpGeoJson,
  VrpStats,
} from '../../types/pipeline.types';
import { round } from '../../utils/geo';
import { minutesToTime } from '../../utils/time';
import { routeGeometry } from './routeGeometry.service';
import { buildWorkbook } from './spreadsheet';
import { BREAK_THRESHOLD_MIN, vehicleLimits } from './solver.service';

const ROUTE_COLORS = [
  '#e6194b',
  '#3cb44b',
  '#4363d8',
  '#f58231',
  '#911eb4',
  '#008080',
  '#f032e6',
  '#9a6324',
  '#800000',
  '#808000',
  '#000075',
  '#469990',
  '#e6770b',
  '#1f77b4',
  '#2ca02c',
  '#d62728',
];

const INFEASIBLE_ROUTE_PENALTY = 10_000;
const UNASSIGNED_PENALTY = 5_000;

const point = (node: { latitude: number | null; longitude: number | null }): number[] => [
  node.longitude ?? 0,
  node.latitude ?? 0,
];

function toRoutingNode(customer: CustomerNode): SolverRoutingNode {
  return {
    index: customer.index,
    nodeId: customer.nodeId,
    name: customer.name,
    zone: customer.zone,
    isDepot: false,
    deliveryWeight: customer.deliveryWeight,
    pickupWeight: customer.pickupWeight,
    deliveryVolume: customer.deliveryVolume,
    serviceDuration: customer.serviceDuration,
    timeWindowEarly: customer.timeWindowEarly,
    timeWindowLate: customer.timeWindowLate,
    latitude: customer.latitude ?? 0,
    longitude: customer.longitude ?? 0,
    originalAddress: customer.originalAddress,
    additionalProperties: customer.additionalProperties,
    productQuantity: customer.productQuantity,
  };
}

export async function buildPlan(input: SolverInput, plan: RoutePlan): Promise<BuiltPlan> {
  const { depot, constraint } = input;
  const routeMetrics: RouteMetric[] = [];
  const geoRoutes: VrpGeoJson['routes'] = [];
  let rerouteCount = 0;
  let excessEarlyTime = 0;
  let excessLateTime = 0;

  for (const [routeIndex, route] of plan.routes.entries()) {
    const { vehicle, stops } = route;
    const path: LatLng[] = [
      depot,
      ...stops.map((stop) => ({ latitude: stop.latitude ?? 0, longitude: stop.longitude ?? 0 })),
      depot,
    ];
    const geometry: RouteGeometry = await routeGeometry(path);
    if (geometry.source === 'osrm') rerouteCount++;

    const limits = vehicleLimits(vehicle, constraint);
    const distance = geometry.legDistancesKm.reduce((sum, leg) => sum + leg, 0);
    const travel = geometry.legDurationsMin.reduce((sum, leg) => sum + leg, 0);
    const service = stops.reduce((sum, stop) => sum + stop.serviceDuration, 0);
    const weight = stops.reduce((sum, stop) => sum + stop.deliveryWeight, 0);
    const volume = stops.reduce((sum, stop) => sum + stop.deliveryVolume, 0);

    let clock = vehicle.startMin;
    let waiting = 0;
    const arrivals: number[] = [clock];
    for (const [stopIndex, stop] of stops.entries()) {
      clock += geometry.legDurationsMin[stopIndex] ?? 0;
      if (clock < stop.timeWindowEarly) {
        waiting += stop.timeWindowEarly - clock;
        excessEarlyTime += stop.timeWindowEarly - clock;
        clock = stop.timeWindowEarly;
      }
      if (clock > stop.timeWindowLate) excessLateTime += clock - stop.timeWindowLate;
      arrivals.push(clock);
      clock += stop.serviceDuration;
    }

    const working = travel + service + waiting;
    const breakDuration = working > BREAK_THRESHOLD_MIN ? vehicle.breakMin : 0;
    const duration = working + breakDuration;
    arrivals.push(vehicle.startMin + duration);

    const excessWeight = Math.max(0, weight - limits.weightKg);
    const excessDistance = Math.max(0, distance - limits.distanceKm);
    const excessDuration = Math.max(0, duration - limits.durationMin);
    const color = ROUTE_COLORS[routeIndex % ROUTE_COLORS.length] ?? '#4363d8';
    const routeLabel = routeIndex + 1;

    routeMetrics.push({
      routeIndex,
      routeLabel,
      vehicleTypeId: vehicle.vehicleTypeId,
      vehicleTypeName: vehicle.vehicleTypeName,
      licensePlate: vehicle.licensePlate,
      routeNodes: [0, ...stops.map((stop) => stop.index), 0],
      customerCount: stops.length,
      routeWeight: round(weight),
      routeVolume: round(volume, 3),
      routeDistance: round(distance),
      routeDuration: round(duration),
      routeTravelDuration: round(travel),
      routeServiceDuration: round(service),
      routeBreakDuration: breakDuration,
      routeCost: round(
        vehicle.fixedCost + distance * vehicle.unitDistanceCost + (duration / 60) * vehicle.unitDurationCost,
      ),
      routeLegDistances: geometry.legDistancesKm.map((leg) => round(leg)),
      routeArrivalTimes: arrivals.map((minutes) => Math.round(minutes)),
      excessWeight: round(excessWeight),
      excessDistance: round(excessDistance),
      excessDuration: round(excessDuration),
      isRouteFeasible: excessWeight === 0 && excessDistance === 0 && excessDuration === 0,
    });

    // The line comes first: the result page reads the route of a stop from the line before it
    const features: GeoJsonFeature[] = [
      {
        type: 'Feature',
        properties: {
          routeIndex,
          routeLabel,
          color,
          distances: geometry.legDistancesKm.map((leg) => round(leg, 1)),
          vehicleType: vehicle.vehicleTypeName,
          licensePlate: vehicle.licensePlate,
        },
        geometry: { type: 'LineString', coordinates: geometry.coordinates },
      },
      ...stops.map((stop): GeoJsonFeature => ({
        type: 'Feature',
        properties: { nodeId: stop.nodeId, routeIndex, routeLabel, color },
        geometry: { type: 'Point', coordinates: point(stop) },
      })),
    ];
    geoRoutes.push({ type: 'FeatureCollection', features });
  }

  const sum = (pick: (route: RouteMetric) => number): number =>
    round(routeMetrics.reduce((total, route) => total + pick(route), 0));

  const infeasibleRouteCount = routeMetrics.filter((route) => !route.isRouteFeasible).length;
  const totalCost = sum((route) => route.routeCost);
  const excessWeight = sum((route) => route.excessWeight);
  const excessDistance = sum((route) => route.excessDistance);
  const excessDuration = sum((route) => route.excessDuration);

  const stats: VrpStats = {
    customerCount: routeMetrics.reduce((total, route) => total + route.customerCount, 0),
    routeCount: routeMetrics.length,
    feasibleRouteCount: routeMetrics.length - infeasibleRouteCount,
    infeasibleRouteCount,
    isSolutionFeasible: infeasibleRouteCount === 0 && plan.unassigned.length === 0 && routeMetrics.length > 0,
    totalFitness: round(
      totalCost +
        infeasibleRouteCount * INFEASIBLE_ROUTE_PENALTY +
        plan.unassigned.length * UNASSIGNED_PENALTY,
    ),
    totalCost,
    totalWeight: sum((route) => route.routeWeight),
    totalVolume: sum((route) => route.routeVolume),
    totalDistance: sum((route) => route.routeDistance),
    totalDuration: sum((route) => route.routeDuration),
    totalTravelDuration: sum((route) => route.routeTravelDuration),
    totalServiceDuration: sum((route) => route.routeServiceDuration),
    totalBreakDuration: sum((route) => route.routeBreakDuration),
    excessWeight,
    excessVolume: 0,
    excessDistance,
    excessDuration,
    excessEarlyTime: round(excessEarlyTime),
    excessLateTime: round(excessLateTime),
    hasExcessWeight: excessWeight > 0,
    hasExcessVolume: false,
    hasExcessDistance: excessDistance > 0,
    hasExcessDuration: excessDuration > 0,
    hasExcessEarlyTime: false,
    hasExcessLateTime: excessLateTime > 0,
    hasIncorrectOrder: false,
    dataUnits: { weightUnit: 'kg', volumeUnit: 'm3', distanceUnit: 'km', timeUnit: 'min' },
    unassignedCustomers: plan.unassigned.map(({ customer, reason }) => ({
      nodeId: customer.nodeId,
      name: customer.name,
      reason,
    })),
  };

  const depotNode: SolverRoutingNode = {
    index: 0,
    nodeId: depot.nodeId,
    name: depot.name,
    zone: '',
    isDepot: true,
    deliveryWeight: 0,
    pickupWeight: 0,
    deliveryVolume: 0,
    serviceDuration: 0,
    timeWindowEarly: 0,
    timeWindowLate: 24 * 60,
    latitude: depot.latitude,
    longitude: depot.longitude,
    originalAddress: {
      address: depot.name,
      subdistrict: null,
      district: null,
      province: null,
      postalCode: null,
    },
    additionalProperties: {},
    productQuantity: [],
  };

  return {
    solution: {
      vrpData: { routingNodes: [depotNode, ...input.customers.map(toRoutingNode)] },
      solutionMetrics: { routeMetrics },
    },
    stats,
    geoJson: {
      routes: geoRoutes,
      depots: [
        {
          type: 'Feature',
          properties: { nodeId: depot.nodeId },
          geometry: { type: 'Point', coordinates: [depot.longitude, depot.latitude] },
        },
      ],
    },
    rerouteCount,
  };
}

export function buildPlanWorkbook(experimentName: string, built: BuiltPlan): Promise<Buffer> {
  const nodes = new Map(built.solution.vrpData.routingNodes.map((node) => [node.index, node]));
  const stopRows: CellValue[][] = [];
  const routeRows: CellValue[][] = [];

  for (const route of built.solution.solutionMetrics.routeMetrics) {
    routeRows.push([
      route.routeLabel,
      route.vehicleTypeName,
      route.licensePlate ?? '-',
      route.customerCount,
      route.routeWeight,
      route.routeDistance,
      round(route.routeTravelDuration / 60),
      round(route.routeServiceDuration / 60),
      round(route.routeDuration / 60),
      route.routeCost,
      route.isRouteFeasible ? 'Yes' : 'No',
    ]);

    let cumulativeKm = 0;
    let load = route.routeWeight;
    route.routeNodes.forEach((nodeIndex, order) => {
      const node = nodes.get(nodeIndex);
      if (!node || node.isDepot) return;
      cumulativeKm += route.routeLegDistances[order - 1] ?? 0;
      const customerName = node.additionalProperties['customerName'];
      stopRows.push([
        route.routeLabel,
        order,
        node.nodeId,
        typeof customerName === 'string' ? customerName : '',
        `${node.latitude}, ${node.longitude}`,
        node.originalAddress.address,
        node.originalAddress.subdistrict ?? '',
        node.originalAddress.district ?? '',
        node.originalAddress.province ?? '',
        node.originalAddress.postalCode ?? '',
        minutesToTime(route.routeArrivalTimes[order] ?? 0),
        round(cumulativeKm),
        node.deliveryWeight,
        round(load),
        route.vehicleTypeName,
        route.licensePlate ?? '-',
      ]);
      load -= node.deliveryWeight;
    });
  }

  const sheets: SheetSpec[] = [
    {
      name: 'Plan',
      headers: [
        'TripNo',
        'order_no',
        'ORDERID_ORG',
        'CUSTOMER_NAME',
        'LatLng',
        'ADDRESS',
        'TUMBOL',
        'AUMPHER',
        'PROVINCE',
        'ZIPCODE',
        'EstimatedTime',
        'Distance',
        'TotalItemWeight',
        'TotalVehicleWeight',
        'VehicleType',
        'LicensePlate',
      ],
      rows: stopRows,
      columnWidths: [8, 10, 18, 28, 24, 40, 20, 20, 16, 10, 14, 10, 16, 18, 22, 14],
    },
    {
      name: 'Routes',
      headers: [
        'TripNo',
        'VehicleType',
        'LicensePlate',
        'Stops',
        'Weight (kg)',
        'Distance (km)',
        'Travel (h)',
        'Service (h)',
        'Total (h)',
        'Cost (THB)',
        'Feasible',
      ],
      rows: routeRows,
    },
    {
      name: 'Summary',
      headers: ['Property', 'Value'],
      rows: [
        ['Experiment', experimentName],
        ['Routes', built.stats.routeCount],
        ['Customers', built.stats.customerCount],
        ['Unassigned customers', built.stats.unassignedCustomers.length],
        ['Total distance (km)', built.stats.totalDistance],
        ['Total duration (min)', built.stats.totalDuration],
        ['Total weight (kg)', built.stats.totalWeight],
        ['Total cost (THB)', built.stats.totalCost],
        ['Feasible', built.stats.isSolutionFeasible ? 'Yes' : 'No'],
      ],
      columnWidths: [26, 40],
    },
  ];
  return buildWorkbook(sheets);
}
