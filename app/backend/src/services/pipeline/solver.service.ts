import { LatLng } from '../../types/geo.types';
import { Constraint } from '../../types/parameter.types';
import {
  CustomerNode,
  FleetVehicle,
  PlannedRoute,
  RoutePlan,
  SolverDepot,
  SolverInput,
  UnassignedCustomer,
  VehicleLimits,
} from '../../types/pipeline.types';
import { roadDistanceKm, travelMinutes } from '../../utils/geo';
import { timeToMinutes } from '../../utils/time';
import { UNLIMITED } from './validation.service';

// A break is only taken on a route long enough to run into it
export const BREAK_THRESHOLD_MIN = 4 * 60;

const TWO_OPT_PASSES = 40;

const positive = (value: number | string | undefined): number | null => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

export function vehicleLimits(vehicle: FleetVehicle, constraint: Constraint): VehicleLimits {
  const workDay = vehicle.endMin - vehicle.startMin;
  return {
    weightKg: Math.min(vehicle.capacityKg, positive(constraint.vehicleOrderSizeCapacity) ?? UNLIMITED),
    volumeM3: vehicle.capacityVolume,
    distanceKm: Math.min(vehicle.maxDistanceKm, positive(constraint.maximumTravelDistance) ?? UNLIMITED),
    durationMin: Math.min(
      vehicle.maxDurationMin,
      workDay > 0 ? workDay : UNLIMITED,
      positive(timeToMinutes(constraint.maximumWorkDuration)) ?? UNLIMITED,
    ),
  };
}

const hasPoint = (customer: CustomerNode): customer is CustomerNode & LatLng =>
  customer.latitude !== null && customer.longitude !== null;

class Planner {
  private readonly matrix: number[][];

  constructor(
    depot: SolverDepot,
    private readonly customers: Array<CustomerNode & LatLng>,
    private readonly constraint: Constraint,
  ) {
    const points: LatLng[] = [depot, ...customers];
    this.matrix = points.map((from) => points.map((to) => roadDistanceKm(from, to)));
  }

  // Position 0 is the depot; customer i sits at position i + 1
  private km(from: number, to: number): number {
    return this.matrix[from]?.[to] ?? 0;
  }

  private tourKm(tour: number[]): number {
    let total = 0;
    let previous = 0;
    for (const position of tour) {
      total += this.km(previous, position);
      previous = position;
    }
    return total + this.km(previous, 0);
  }

  private nearestNeighbour(positions: number[], start = 0): number[] {
    const remaining = new Set(positions);
    const tour: number[] = [];
    let current = start;
    while (remaining.size) {
      let next = -1;
      let best = Number.POSITIVE_INFINITY;
      for (const candidate of remaining) {
        const distance = this.km(current, candidate);
        if (distance < best) {
          best = distance;
          next = candidate;
        }
      }
      remaining.delete(next);
      tour.push(next);
      current = next;
    }
    return tour;
  }

  // 2-opt on the stretch tour[from..to]; whatever sits on either side of it (the depot at the
  // ends of the tour) stays where it is
  private twoOpt(tour: number[], from: number, to: number): void {
    for (let pass = 0; pass < TWO_OPT_PASSES; pass++) {
      let improved = false;
      for (let i = from; i < to; i++) {
        for (let k = i + 1; k <= to; k++) {
          const before = tour[i - 1] ?? 0;
          const after = tour[k + 1] ?? 0;
          const first = tour[i] ?? 0;
          const last = tour[k] ?? 0;
          const delta =
            this.km(before, last) + this.km(first, after) - this.km(before, first) - this.km(last, after);
          if (delta < -1e-9) {
            const reversed = tour.slice(i, k + 1).reverse();
            tour.splice(i, reversed.length, ...reversed);
            improved = true;
          }
        }
      }
      if (!improved) break;
    }
  }

  // Stops that share a delivery window are visited together, earliest window first, so a morning
  // slot is not left for the end of the day. Within a window the order is the shortest found.
  order(positions: number[]): number[] {
    const byWindow = new Map<string, { middle: number; positions: number[] }>();
    for (const position of positions) {
      const customer = this.customers[position - 1];
      const early = customer?.timeWindowEarly ?? 0;
      const late = customer?.timeWindowLate ?? 0;
      const group = byWindow.get(`${early}-${late}`) ?? { middle: (early + late) / 2, positions: [] };
      group.positions.push(position);
      byWindow.set(`${early}-${late}`, group);
    }

    const tour: number[] = [];
    const stretches: Array<[from: number, to: number]> = [];
    for (const group of [...byWindow.values()].sort((a, b) => a.middle - b.middle)) {
      const ordered = this.nearestNeighbour(group.positions, tour.at(-1) ?? 0);
      stretches.push([tour.length, tour.length + ordered.length - 1]);
      tour.push(...ordered);
    }
    for (const [from, to] of stretches) this.twoOpt(tour, from, to);
    return tour;
  }

  fits(vehicle: FleetVehicle, positions: number[]): boolean {
    const limits = vehicleLimits(vehicle, this.constraint);
    let weight = 0;
    let volume = 0;
    let service = 0;
    for (const position of positions) {
      const customer = this.customers[position - 1];
      if (!customer) continue;
      weight += customer.deliveryWeight;
      volume += customer.deliveryVolume;
      service += customer.serviceDuration;
    }
    if (weight > limits.weightKg || volume > limits.volumeM3) return false;

    const distance = this.tourKm(this.order(positions));
    if (distance > limits.distanceKm) return false;

    const working = travelMinutes(distance) + service;
    const duration = working + (working > BREAK_THRESHOLD_MIN ? vehicle.breakMin : 0);
    return duration <= limits.durationMin;
  }

  stops(positions: number[]): CustomerNode[] {
    return this.order(positions).flatMap((position) => {
      const customer = this.customers[position - 1];
      return customer ? [customer] : [];
    });
  }

  // Customers sorted by bearing from the depot, starting after the widest empty sector, so
  // neighbours end up on the same vehicle and no route straddles the gap
  sweep(depot: SolverDepot): number[] {
    const angled = this.customers
      .map((customer, index) => ({
        position: index + 1,
        angle: Math.atan2(customer.latitude - depot.latitude, customer.longitude - depot.longitude),
      }))
      .sort((a, b) => a.angle - b.angle);
    if (angled.length < 2) return angled.map((entry) => entry.position);

    let start = 0;
    let widest = -1;
    for (let i = 0; i < angled.length; i++) {
      const current = angled[i];
      const next = angled[(i + 1) % angled.length];
      if (!current || !next) continue;
      const gap =
        i === angled.length - 1 ? next.angle + 2 * Math.PI - current.angle : next.angle - current.angle;
      if (gap > widest) {
        widest = gap;
        start = (i + 1) % angled.length;
      }
    }
    return [...angled.slice(start), ...angled.slice(0, start)].map((entry) => entry.position);
  }
}

// Sweep construction with a nearest-neighbour + 2-opt ordering per vehicle. It is a heuristic
// stand-in for the optimisation service: fast, deterministic, and it respects every vehicle limit.
export function planRoutes(input: SolverInput): RoutePlan {
  const { depot, constraint } = input;
  const located = input.customers.filter(hasPoint);
  const unassigned: UnassignedCustomer[] = input.customers
    .filter((customer) => !hasPoint(customer))
    .map((customer) => ({ customer, reason: 'invalid_coordinate' }));

  const vehicleCap = positive(constraint.numberOfVehicleAvailable);
  const fleet = [...input.fleet]
    .sort((a, b) => b.capacityKg - a.capacityKg)
    .slice(0, vehicleCap ? Math.floor(vehicleCap) : undefined);

  const planner = new Planner(depot, located, constraint);
  const routes: PlannedRoute[] = [];
  let load: number[] = [];

  const close = (): void => {
    const vehicle = fleet.shift();
    if (vehicle && load.length) routes.push({ vehicle, stops: planner.stops(load) });
    load = [];
  };

  for (const position of planner.sweep(depot)) {
    const customer = located[position - 1];
    if (!customer) continue;

    let vehicle = fleet[0];
    if (vehicle && load.length && !planner.fits(vehicle, [...load, position])) {
      close();
      vehicle = fleet[0];
    }
    if (!vehicle) {
      unassigned.push({ customer, reason: 'no_vehicle_available' });
      continue;
    }
    if (planner.fits(vehicle, [...load, position])) {
      load.push(position);
      continue;
    }

    // The vehicle next in line cannot take this order even on its own: give it a vehicle of its
    // own from further down the fleet, if any can carry it
    const alternative = fleet.findIndex(
      (candidate, index) => index > 0 && planner.fits(candidate, [position]),
    );
    const [dedicated] = alternative > 0 ? fleet.splice(alternative, 1) : [];
    if (dedicated) routes.push({ vehicle: dedicated, stops: planner.stops([position]) });
    else unassigned.push({ customer, reason: 'exceeds_vehicle_limits' });
  }
  close();

  return { routes, unassigned };
}
