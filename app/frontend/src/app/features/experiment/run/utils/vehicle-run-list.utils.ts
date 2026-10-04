import {
  DEFAULT_MAX_TRIP,
  OpenVrpEndOfRoute,
  OpenVrpRunVehicleEntry,
  OpenVrpRunVehicleGroup,
} from '@features/configurations/models/vehicle.model';

const ROUTE_ORDER: Record<OpenVrpEndOfRoute, number> = {
  return: 0,
  no_return: 1,
};

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
    group.entries.sort(
      (a, b) => ROUTE_ORDER[a.endOfRoute] - ROUTE_ORDER[b.endOfRoute],
    );
  }
  return groups;
}
