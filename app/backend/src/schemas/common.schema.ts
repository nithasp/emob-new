import { z } from 'zod';

export const MIN_PASSWORD_LENGTH = 8;

export const requiredText = (max: number) =>
  z.string('is required').trim().min(1, 'is required').max(max, `must be at most ${max} characters`);

export const optionalText = (max: number) => requiredText(max).optional();

// A cleared form field arrives as null, an empty string or not at all; all three mean "no value"
export const nullableText = (max: number) =>
  z
    .union([z.string().trim().max(max, `must be at most ${max} characters`), z.null()])
    .optional()
    .transform((value) => (value === undefined || value === null || value === '' ? null : value));

export const password = z
  .string('is required')
  .min(MIN_PASSWORD_LENGTH, `must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(128, 'must be at most 128 characters');

export const uuid = z.uuid('must be a valid id');

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DURATION = /^\d{1,3}:[0-5]\d$/;

export const timeOfDay = z.string('is required').trim().regex(TIME, 'must be a time such as 08:30');

export const duration = z.string('is required').trim().regex(DURATION, 'must be a duration such as 01:30');

export const nullable = <T extends z.ZodType>(schema: T) =>
  z
    .union([schema, z.null()])
    .optional()
    .transform((value) => value ?? null);

export const nonNegative = z
  .number('must be a number')
  .min(0, 'must be 0 or more')
  .max(1e9, 'is too large')
  .refine(Number.isFinite, { error: 'must be a number' });
