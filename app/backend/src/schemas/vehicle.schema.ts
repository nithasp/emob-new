import { z } from 'zod';
import { ACCESS_TYPES, VEHICLE_PROFILE_TYPES } from '../types/vehicle.types';
import {
  duration,
  nonNegative,
  nullable,
  nullableText,
  requiredText,
  timeOfDay,
  uuid,
} from './common.schema';

const MAX_LICENSE_PLATES = 200;

const licensePlate = requiredText(30);

const dimension = z
  .object({
    width: nullable(nonNegative),
    height: nullable(nonNegative),
    depth: nullable(nonNegative),
  })
  .transform((value) =>
    value.width === null && value.height === null && value.depth === null ? null : value,
  );

const vehicleBreak = z.object({
  name: requiredText(60),
  duration,
  timeWindowEarly: timeOfDay,
  timeWindowLate: timeOfDay,
});

// The vehicle type form leaves a cleared field out of the request, so every form field has a
// default here: an update writes the whole form, never a partial one
const vehicleTypeFields = {
  access: z
    .array(z.enum(ACCESS_TYPES, { error: `must be one of: ${ACCESS_TYPES.join(', ')}` }))
    .max(ACCESS_TYPES.length)
    .nullish()
    .transform((value) => [...new Set(value ?? [])]),
  allowedBreaks: z
    .array(vehicleBreak)
    .max(10, 'must hold at most 10 breaks')
    .nullish()
    .transform((value) => value ?? []),
  dimension: z
    .union([dimension, z.null()])
    .optional()
    .transform((value) => value ?? null),
  maximumWeightCapacity: nullable(nonNegative),
  maximumVolumeCapacity: nullable(nonNegative),
  timeWindowEarly: nullable(timeOfDay),
  timeWindowLate: nullable(timeOfDay),
  maximumDistance: nullable(nonNegative),
  maximumDuration: nullable(duration),
  vehicleGroupId: nullableText(60),
  fixedCost: nullable(nonNegative),
  unitDistanceCost: nullable(nonNegative),
  unitDurationCost: nullable(nonNegative),
  vehicleProfileType: z
    .enum(VEHICLE_PROFILE_TYPES, { error: `must be one of: ${VEHICLE_PROFILE_TYPES.join(', ')}` })
    .default('TRUCK'),
  maxpallet: nullable(nonNegative),
  zone: nullableText(120),
  isVehicleAvailable: z.boolean().optional(),
  maxTrip: z.number().int().min(1, 'must be 1 or more').max(50, 'must be at most 50').nullish(),
  loadingDuration: z.union([duration, z.null()]).optional(),
};

const earlyBeforeLate = (value: { timeWindowEarly: string | null; timeWindowLate: string | null }) =>
  !value.timeWindowEarly || !value.timeWindowLate || value.timeWindowEarly < value.timeWindowLate;

export const vehicleTypeSchema = z
  .object({ name: requiredText(120), ...vehicleTypeFields })
  .refine(earlyBeforeLate, { error: 'must be before timeWindowLate', path: ['timeWindowEarly'] });

export const newVehiclesSchema = z.object({
  licensePlates: z
    .array(licensePlate, 'is required')
    .min(1, 'must hold at least one license plate')
    .max(MAX_LICENSE_PLATES, `must hold at most ${MAX_LICENSE_PLATES} license plates`),
  startDepotId: uuid,
  endDepotId: uuid,
  vehicleTypeId: uuid,
});

export const vehicleUpdateSchema = z.object({
  licensePlate: licensePlate.optional(),
  startDepotId: uuid.optional(),
  endDepotId: uuid.optional(),
  vehicleTypeId: uuid.optional(),
  isActive: z.boolean().optional(),
});
