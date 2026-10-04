import { z } from 'zod';
import { optionalText, password, requiredText } from './common.schema';

const username = requiredText(100)
  .min(3, 'must be at least 3 characters')
  .regex(/^[\p{L}\p{N}._@+-]+$/u, 'may only contain letters, digits and . _ @ + -');

export const registerSchema = z.object({
  username,
  password,
  firstName: optionalText(100),
  lastName: optionalText(100),
});

export const loginSchema = z.object({
  username: requiredText(100),
  password: z.string('is required').min(1, 'is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
