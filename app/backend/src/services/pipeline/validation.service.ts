import { Constraint } from '../../types/parameter.types';
import {
  CustomerNode,
  FleetVehicle,
  IssueDetail,
  RunLimits,
  ValidateResult,
  ValidationInput,
  ValidationIssue,
  VehicleSelection,
} from '../../types/pipeline.types';
import { VehicleRow, VehicleType } from '../../types/vehicle.types';
import { roadDistanceKm, round, travelMinutes } from '../../utils/geo';
import { timeToMinutes } from '../../utils/time';

export const UNLIMITED = 1e9;

const CM3_PER_M3 = 1_000_000;
const MAX_ISSUE_DETAILS = 200;

const positive = (value: number | string | null | undefined): number | null => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

function volumeCapacityM3(type: VehicleType): number {
  const { width, height, depth } = type.dimension ?? { width: null, height: null, depth: null };
  if (width && height && depth) return (width * height * depth) / CM3_PER_M3;
  return type.maximumVolumeCapacity ? type.maximumVolumeCapacity / CM3_PER_M3 : UNLIMITED;
}

export function buildFleet(
  selections: VehicleSelection[],
  types: VehicleType[],
  vehicles: VehicleRow[],
  constraint: Constraint,
): FleetVehicle[] {
  const dayStart = timeToMinutes(constraint.earlyDeliveryTime, 8 * 60);
  const dayEnd = timeToMinutes(constraint.backToDepotTime, 18 * 60);
  const fleet: FleetVehicle[] = [];

  for (const selection of selections) {
    const type = types.find((candidate) => candidate.vehicleTypeId === selection.vehicleTypeId);
    if (!type) continue;

    const picked = selection.specificVehicleIds
      .map((vehicleId) => vehicles.find((vehicle) => vehicle.vehicleId === vehicleId))
      .filter((vehicle): vehicle is VehicleRow => !!vehicle);
    const anonymous = Math.max(0, selection.numberOfVehiclesAvailable);

    const base = {
      vehicleTypeId: type.vehicleTypeId,
      vehicleTypeName: type.name,
      capacityKg: positive(type.maximumWeightCapacity) ?? UNLIMITED,
      capacityVolume: volumeCapacityM3(type),
      maxDistanceKm: positive(type.maximumDistance) ?? UNLIMITED,
      maxDurationMin: positive(timeToMinutes(type.maximumDuration)) ?? UNLIMITED,
      startMin: Math.max(dayStart, timeToMinutes(type.timeWindowEarly, dayStart)),
      endMin: Math.min(dayEnd, timeToMinutes(type.timeWindowLate, dayEnd)),
      breakMin: type.allowedBreaks.reduce((sum, item) => sum + timeToMinutes(item.duration), 0),
      fixedCost: type.fixedCost ?? 0,
      unitDistanceCost: type.unitDistanceCost ?? 0,
      unitDurationCost: type.unitDurationCost ?? 0,
    };

    for (const vehicle of picked) {
      fleet.push({ ...base, vehicleId: vehicle.vehicleId, licensePlate: vehicle.licensePlate });
    }
    for (let i = 0; i < anonymous; i++) fleet.push({ ...base, vehicleId: null, licensePlate: null });
  }
  return fleet;
}

export function runLimits(fleet: FleetVehicle[], constraint: Constraint): RunLimits {
  const most = (pick: (vehicle: FleetVehicle) => number): number =>
    fleet.length ? Math.max(...fleet.map(pick)) : UNLIMITED;

  const workDay = most((vehicle) => vehicle.endMin - vehicle.startMin);
  return {
    weightKg: Math.min(
      most((v) => v.capacityKg),
      positive(constraint.vehicleOrderSizeCapacity) ?? UNLIMITED,
    ),
    distanceKm: Math.min(
      most((v) => v.maxDistanceKm),
      positive(constraint.maximumTravelDistance) ?? UNLIMITED,
    ),
    durationMin: Math.min(
      most((v) => v.maxDurationMin),
      workDay > 0 ? workDay : UNLIMITED,
      positive(timeToMinutes(constraint.maximumWorkDuration)) ?? UNLIMITED,
    ),
  };
}

export function validateRun(input: ValidationInput): ValidateResult {
  const { locations, constraint, fleet, orderFileName, missingProducts } = input;
  const depot = locations.depots[0];
  const limits = runLimits(fleet, constraint);
  const serviceMin = timeToMinutes(constraint.serviceDurationTime, 0);

  const overWeight: CustomerNode[] = [];
  const overDistance: CustomerNode[] = [];
  const invalidCoordinate: CustomerNode[] = [];
  const zeroWeight: CustomerNode[] = [];
  const hardIssues: IssueDetail[] = [];

  for (const customer of locations.customers) {
    const row = customer.additionalProperties.row;
    const metrics = customer.metrics;
    if (serviceMin > 0) customer.serviceDuration = serviceMin;

    if (customer.deliveryWeight <= 0) zeroWeight.push(customer);

    const excessWeight = Math.max(0, customer.deliveryWeight - limits.weightKg);
    if (excessWeight > 0) {
      overWeight.push(customer);
      hardIssues.push({
        type: 'bus_hard_constraint_weight',
        input: round(customer.deliveryWeight),
        inputType: 'float',
        location: [row, 'QUANTITYMAIN'],
        context: { limits: round(limits.weightKg) },
      });
    }

    let excessDistance = 0;
    let excessDuration = 0;
    if (customer.latitude === null || customer.longitude === null || !depot) {
      invalidCoordinate.push(customer);
    } else {
      const roundTripKm =
        2 * roadDistanceKm(depot, { latitude: customer.latitude, longitude: customer.longitude });
      const roundTripMin = travelMinutes(roundTripKm) + customer.serviceDuration;

      excessDistance = Math.max(0, roundTripKm - limits.distanceKm);
      if (excessDistance > 0) {
        overDistance.push(customer);
        hardIssues.push({
          type: 'bus_hard_constraint_distance',
          input: round(roundTripKm),
          inputType: 'float',
          location: [row, 'LatLng'],
          context: { limits: round(limits.distanceKm) },
        });
      }

      excessDuration = Math.max(0, roundTripMin - limits.durationMin);
      if (excessDuration > 0) {
        hardIssues.push({
          type: 'bus_hard_constraint_duration',
          input: round(roundTripMin),
          inputType: 'float',
          location: [row, 'LatLng'],
          context: { limits: round(limits.durationMin) },
        });
      }
    }

    if (metrics) {
      metrics.excessWeight = round(excessWeight);
      metrics.excessDistance = round(excessDistance);
      metrics.excessDuration = round(excessDuration);
      metrics.hasExcessWeight = excessWeight > 0;
      metrics.hasExcessDistance = excessDistance > 0;
      metrics.hasExcessDuration = excessDuration > 0;
      metrics.isNodeFeasible = excessWeight === 0 && excessDistance === 0 && excessDuration === 0;
    }
  }

  const warning: ValidationIssue[] = missingProducts.length
    ? [{ errorType: 'missing_product', title: orderFileName, detail: missingProducts }]
    : [];
  const error: ValidationIssue[] = hardIssues.length
    ? [
        {
          errorType: 'constraint_validation',
          title: orderFileName,
          detail: hardIssues.slice(0, MAX_ISSUE_DETAILS),
        },
      ]
    : [];

  const message = error.length
    ? `Validation failed: ${hardIssues.length} order(s) cannot be served by the selected vehicles.`
    : warning.length
      ? 'Validation passed with warnings.'
      : 'Validation passed. The plan is ready to be routed.';

  return {
    message,
    validate: {
      filters: {
        constraints: { over_distance: overDistance, over_weight: overWeight },
        order_data: { invalid_coordinate: invalidCoordinate },
      },
      warning: { zero_weight: zeroWeight },
    },
    isSuccesses: error.length === 0,
    isWarning: warning.length > 0,
    warning,
    error,
  };
}
