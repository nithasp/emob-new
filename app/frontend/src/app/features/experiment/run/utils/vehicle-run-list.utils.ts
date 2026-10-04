import {
  DEFAULT_MAX_TRIP,
  OpenVrpEndOfRoute,
  OpenVrpRunVehicleEntry,
  OpenVrpRunVehicleGroup,
} from '@features/configurations/models/vehicle.model';

/** Return-to-depot rows lead each block; open routes sink to the bottom. */
const ROUTE_ORDER: Record<OpenVrpEndOfRoute, number> = {
  return: 0,
  no_return: 1,
};

/**
 * Two rows describe the same vehicles when only their size tells them apart:
 * same type, same way of picking, same route and same trips.
 */
function isSameRunCondition(
  a: OpenVrpRunVehicleEntry,
  b: OpenVrpRunVehicleEntry,
): boolean {
  return (
    a.vehicleTypeId === b.vehicleTypeId &&
    a.mode === b.mode &&
    a.endOfRoute === b.endOfRoute &&
    a.startDepotId === b.startDepotId &&
    (a.endDepotId || null) === (b.endDepotId || null) &&
    (a.maxTrip || DEFAULT_MAX_TRIP) === (b.maxTrip || DEFAULT_MAX_TRIP) &&
    (a.loadingDuration || null) === (b.loadingDuration || null)
  );
}

/**
 * Adds `entry` to the run list, unless a row with exactly the same conditions
 * is already there. That row then takes the vehicles — plates are unioned so
 * a vehicle is never listed twice — and is returned, so the caller can tell
 * the planner that no new row was created.
 */
export function addOrMergeRunEntry(
  list: OpenVrpRunVehicleEntry[],
  entry: OpenVrpRunVehicleEntry,
): OpenVrpRunVehicleEntry | null {
  const existing = list.find((candidate) =>
    isSameRunCondition(candidate, entry),
  );
  if (!existing) {
    list.push(entry);
    return null;
  }

  if (existing.mode === 'license-plate') {
    entry.vehicleIds.forEach((vehicleId, index) => {
      if (existing.vehicleIds.includes(vehicleId)) return;
      existing.vehicleIds.push(vehicleId);
      existing.licensePlates.push(entry.licensePlates[index]);
    });
    existing.count = existing.vehicleIds.length;
  } else {
    existing.count += entry.count;
  }
  return existing;
}

/**
 * One block per vehicle type, in the order each type first joined the run.
 * Inside a block closed routes come first and open routes last; rows sharing
 * a route keep the order they were added in.
 */
export function groupRunEntriesByVehicleType(
  entries: OpenVrpRunVehicleEntry[] | undefined,
): OpenVrpRunVehicleGroup[] {
  const groups: OpenVrpRunVehicleGroup[] = [];
  const byType = new Map<string, OpenVrpRunVehicleGroup>();

  for (const entry of entries || []) {
    let group = byType.get(entry.vehicleTypeId);
    if (!group) {
      group = {
        vehicleTypeId: entry.vehicleTypeId,
        vehicleTypeName: entry.vehicleTypeName,
        total: 0,
        entries: [],
      };
      byType.set(entry.vehicleTypeId, group);
      groups.push(group);
    }
    group.entries.push(entry);
    group.total += entry.count;
  }

  for (const group of groups) {
    // Array#sort is stable, so rows on the same route keep insertion order
    group.entries.sort(
      (a, b) => ROUTE_ORDER[a.endOfRoute] - ROUTE_ORDER[b.endOfRoute],
    );
  }
  return groups;
}
