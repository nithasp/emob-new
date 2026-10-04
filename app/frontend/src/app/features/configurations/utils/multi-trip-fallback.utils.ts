import {
  DEFAULT_LOADING_DURATION,
  DEFAULT_VEHICLE_TYPE_MAX_TRIP,
  MultiTripSystemDefaults,
  SYSTEM_MAX_TRIP,
  VehicleType,
  VehicleTypeMultiTrip,
} from '../models/vehicle.model';

export const MULTI_TRIP_API_READY = false;

const MOCK_MULTI_TRIP_DEFAULTS: MultiTripSystemDefaults = {
  defaultMaxTrip: DEFAULT_VEHICLE_TYPE_MAX_TRIP,
  systemMaxTrip: SYSTEM_MAX_TRIP,
  defaultLoadingDuration: DEFAULT_LOADING_DURATION,
};

export function getMultiTripSystemDefaults(): MultiTripSystemDefaults {
  return MOCK_MULTI_TRIP_DEFAULTS;
}

const MULTI_TRIP_STORAGE_KEY = 'vehicleTypeMultiTripFallback';

function readAll(): Record<string, VehicleTypeMultiTrip> {
  if (MULTI_TRIP_API_READY) return {};
  try {
    const raw = localStorage.getItem(MULTI_TRIP_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, VehicleTypeMultiTrip>): void {
  try {
    localStorage.setItem(MULTI_TRIP_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Storage can be unavailable or full (private browsing, quota). The
    // fallback is a convenience until the API ships, so a failed write is
    // dropped rather than surfaced.
  }
}

function merge<T extends VehicleType>(
  vehicleType: T,
  multiTrip?: VehicleTypeMultiTrip
): T {
  if (!vehicleType || !multiTrip) return vehicleType;
  return {
    ...vehicleType,
    maxTrip: multiTrip.maxTrip,
    loadingDuration: multiTrip.loadingDuration,
  };
}

export function applyMultiTripFallback<T extends VehicleType>(
  vehicleTypes: T[]
): T[] {
  if (MULTI_TRIP_API_READY) return vehicleTypes || [];
  const stored = readAll();
  return (vehicleTypes || []).map((vehicleType) =>
    merge(vehicleType, stored[vehicleType?.vehicleTypeId])
  );
}

export function splitMultiTripInput(input: VehicleType): {
  payload: VehicleType;
  multiTrip: VehicleTypeMultiTrip;
} {
  const { maxTrip, loadingDuration, ...rest } = input || ({} as VehicleType);
  return {
    payload: MULTI_TRIP_API_READY ? input : (rest as VehicleType),
    multiTrip: { maxTrip, loadingDuration: loadingDuration ?? undefined },
  };
}

export function persistMultiTripFallback(
  vehicleTypeId: string | undefined,
  multiTrip: VehicleTypeMultiTrip
): void {
  if (MULTI_TRIP_API_READY || !vehicleTypeId) return;
  const all = readAll();
  all[vehicleTypeId] = multiTrip;
  writeAll(all);
}

export function forgetMultiTripFallback(
  vehicleTypeId: string | undefined
): void {
  if (MULTI_TRIP_API_READY || !vehicleTypeId) return;
  const all = readAll();
  delete all[vehicleTypeId];
  writeAll(all);
}
