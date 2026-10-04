import {
  DEFAULT_MAX_TRIP,
  MockRunGroup,
  OpenVrpDepotRunList,
  OpenVrpDepotSummary,
  OpenVrpRunSummaryTotals,
  OpenVrpRunVehicleEntry,
} from '@features/configurations/models/vehicle.model';

/**
 * Flips to true once a run reports a vehicle list for more than one depot.
 * Only the *extra* depots below are mock — the aggregation every summary
 * figure goes through is the real one, so the switch is all that changes when
 * the API ships.
 */
export const MULTI_DEPOT_API_READY = false;

export function emptyRunSummaryTotals(): OpenVrpRunSummaryTotals {
  return {
    total: 0,
    returnCount: 0,
    noReturnCount: 0,
    multiTripCount: 0,
    plannedTrips: 0,
  };
}

/**
 * The single place run entries turn into figures. Every block on the summary
 * pane — each depot and the fleet-wide roll-up — is counted by this function,
 * so a depot's numbers and the total can never drift apart.
 */
export function sumRunEntries(
  entries: OpenVrpRunVehicleEntry[] | undefined,
): OpenVrpRunSummaryTotals {
  const totals = emptyRunSummaryTotals();
  for (const entry of entries || []) {
    if (entry.endOfRoute === 'return') {
      totals.returnCount += entry.count;
    } else {
      totals.noReturnCount += entry.count;
    }
    const maxTrip = entry.maxTrip || DEFAULT_MAX_TRIP;
    totals.plannedTrips += entry.count * maxTrip;
    if (maxTrip > DEFAULT_MAX_TRIP) {
      totals.multiTripCount += entry.count;
    }
  }
  totals.total = totals.returnCount + totals.noReturnCount;
  return totals;
}

/** Fleet-wide roll-up — the bottom block of the summary pane. */
export function sumDepotSummaries(
  summaries: OpenVrpDepotSummary[],
): OpenVrpRunSummaryTotals {
  const grand = emptyRunSummaryTotals();
  for (const summary of summaries || []) {
    grand.total += summary.totals.total;
    grand.returnCount += summary.totals.returnCount;
    grand.noReturnCount += summary.totals.noReturnCount;
    grand.multiTripCount += summary.totals.multiTripCount;
    grand.plannedTrips += summary.totals.plannedTrips;
  }
  return grand;
}

// ======================================================================
// Preview data — dropped the day MULTI_DEPOT_API_READY turns true
// ======================================================================

/** One sample run list per extra depot, so the blocks read differently. */
const MOCK_DEPOT_RUN_GROUPS: MockRunGroup[][] = [
  [
    { count: 6, endOfRoute: 'return', maxTrip: 2 },
    { count: 4, endOfRoute: 'no_return', maxTrip: 1 },
  ],
  [
    { count: 3, endOfRoute: 'return', maxTrip: 3 },
    { count: 2, endOfRoute: 'return', maxTrip: 1 },
    { count: 5, endOfRoute: 'no_return', maxTrip: 1 },
  ],
];

/** Stand-in depots for a company whose master data only has one. */
const MOCK_DEPOT_NAMES = ['Lat Krabang DC', 'Bang Na Hub'];

const MOCK_LOADING_DURATION = '00:30';

/**
 * Sample run lists for depots the run does not carry yet. Real depots from the
 * master data are preferred, so the preview reads with the company's own
 * names; invented ones only fill in when there is nothing left to borrow.
 *
 * The entries are ordinary `OpenVrpRunVehicleEntry` objects on purpose: they
 * go through `sumRunEntries` exactly like real ones, so the preview exercises
 * the real aggregation rather than a parallel mock path.
 */
export function buildMockDepotRunLists(
  depots: Array<{ depotId: string; depotName: string }>,
  vehicleTypes: Array<{ vehicleTypeId: string; vehicleTypeName: string }>,
  usedDepotIds: Set<string>,
): OpenVrpDepotRunList[] {
  if (MULTI_DEPOT_API_READY) return [];

  const spare = (depots || []).filter(
    (depot) => depot?.depotId && !usedDepotIds.has(depot.depotId),
  );
  const lists: OpenVrpDepotRunList[] = [];

  for (let index = 0; index < MOCK_DEPOT_RUN_GROUPS.length; index++) {
    const borrowed = spare[index];
    const depotId = borrowed?.depotId || `mock-depot-${index + 1}`;
    const depotName = borrowed?.depotName || MOCK_DEPOT_NAMES[index];
    lists.push({
      depotId,
      depotName,
      entries: MOCK_DEPOT_RUN_GROUPS[index].map((group, groupIndex) =>
        buildMockEntry(group, groupIndex, index, depotId, depotName, vehicleTypes),
      ),
    });
  }

  return lists;
}

function buildMockEntry(
  group: MockRunGroup,
  groupIndex: number,
  depotIndex: number,
  depotId: string,
  depotName: string,
  vehicleTypes: Array<{ vehicleTypeId: string; vehicleTypeName: string }>,
): OpenVrpRunVehicleEntry {
  const vehicleType = (vehicleTypes || [])[
    (depotIndex + groupIndex) % Math.max(1, (vehicleTypes || []).length)
  ];
  const returnToDepot = group.endOfRoute === 'return';
  return {
    // negative so a preview row can never collide with a real run entry id
    id: -(depotIndex * 100 + groupIndex + 1),
    vehicleTypeId: vehicleType?.vehicleTypeId || `mock-type-${groupIndex + 1}`,
    vehicleTypeName: vehicleType?.vehicleTypeName || '-',
    mode: 'count',
    count: group.count,
    licensePlates: [],
    vehicleIds: [],
    endOfRoute: group.endOfRoute,
    startDepotId: depotId,
    startDepotName: depotName,
    endDepotId: returnToDepot ? depotId : null,
    endDepotName: returnToDepot ? depotName : null,
    maxTrip: group.maxTrip,
    loadingDuration:
      group.maxTrip > DEFAULT_MAX_TRIP ? MOCK_LOADING_DURATION : null,
  };
}
