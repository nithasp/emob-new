import { z } from 'zod';
import { uuid } from './common.schema';

const MAX_VEHICLES_PER_TYPE = 1000;
const MAX_LOCATION_UPDATES = 5000;
const MAX_PARAMETER_KEYS = 100;

const parameterValue = z.union([z.string().max(200), z.number().refine(Number.isFinite)]);

export const validateExperimentSchema = z.object({
  runId: uuid,
  parameter: z
    .record(z.string().max(80), parameterValue)
    .refine((value) => Object.keys(value).length <= MAX_PARAMETER_KEYS, { error: 'holds too many keys' }),
  updateLocation: z
    .object({
      customers: z
        .array(
          z.object({
            nodeId: z.string().max(200).nullish(),
            name: z.string().max(200).nullish(),
            index: z.number().int().nullish(),
            latitude: z.number().min(-90).max(90),
            longitude: z.number().min(-180).max(180),
          }),
        )
        .max(MAX_LOCATION_UPDATES),
    })
    .nullish(),
  vehicles: z
    .array(
      z.object({
        vehicleTypeId: uuid,
        vehicleId: z.array(uuid).max(MAX_VEHICLES_PER_TYPE).nullish(),
        numberOfVehiclesAvailable: z.number().int().min(0).max(MAX_VEHICLES_PER_TYPE).nullish(),
      }),
    )
    .max(200)
    .nullish(),
});

export const uploadPreOrderSchema = z.object({
  runId: uuid,
  depotId: z.array(uuid).max(20).nullish(),
});

export const dynamicParameterUpdatesSchema = z
  .array(z.object({ id: uuid, value: parameterValue }))
  .min(1, 'must hold at least one update')
  .max(200);

export type ValidateExperimentInput = z.infer<typeof validateExperimentSchema>;
