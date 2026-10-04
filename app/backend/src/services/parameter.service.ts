import { withTransaction } from '../database';
import { dynamicParameterUpdatesSchema } from '../schemas/experiment.schema';
import {
  Constraint,
  DynamicParameter,
  DynamicParameterUpdateError,
  DynamicParameterUpdateResult,
} from '../types/parameter.types';
import { ParameterServiceDeps } from '../types/service.types';
import { AppError } from '../utils/errors';
import { parse } from '../utils/validation';

const NUMBER_TYPE = /^number/i;

export const constraintKey = (keyName: string): string => keyName.charAt(0).toLowerCase() + keyName.slice(1);

function problemWith(parameter: DynamicParameter, value: string | number): string | null {
  const rule = parameter.joiConfig;
  const fallback = rule.message || `${parameter.keyName} is not valid`;

  if (rule.type === 'number' || NUMBER_TYPE.test(parameter.valueType)) {
    const number = Number(value);
    if (value === '' || !Number.isFinite(number)) return fallback;
    if (rule.min !== undefined && number < rule.min) return fallback;
    if (rule.max !== undefined && number > rule.max) return fallback;
    return null;
  }

  const text = String(value).trim();
  if (!text) return rule.required ? fallback : null;
  if (rule.pattern && !new RegExp(rule.pattern).test(text)) return fallback;
  return null;
}

export function toConstraint(parameters: DynamicParameter[]): Constraint {
  const constraint: Constraint = {};
  for (const parameter of parameters) {
    const value = parameter.value ?? parameter.defaultValue;
    if (value === null || value === '') continue;
    constraint[constraintKey(parameter.keyName)] = NUMBER_TYPE.test(parameter.valueType)
      ? Number(value)
      : value;
  }
  return constraint;
}

export function snapshotParameters(
  parameters: DynamicParameter[],
  constraint: Constraint,
): DynamicParameter[] {
  return parameters.map((parameter) => {
    const value = constraint[constraintKey(parameter.keyName)];
    return value === undefined ? parameter : { ...parameter, value };
  });
}

export function scopeToDepot(parameters: DynamicParameter[], depotId: string | null): DynamicParameter[] {
  const byKey = new Map<string, DynamicParameter>();
  for (const parameter of parameters) {
    if (parameter.depotId && parameter.depotId !== depotId) continue;
    const existing = byKey.get(parameter.keyName);
    if (!existing || (!existing.depotId && parameter.depotId)) byKey.set(parameter.keyName, parameter);
  }
  return [...byKey.values()];
}

export function createParameterService({ parameters }: ParameterServiceDeps) {
  return {
    list(companyId: string, depotId: string | null): Promise<DynamicParameter[]> {
      return parameters.listForDepot(companyId, depotId || null);
    },

    async constraintFor(companyId: string, depotId: string | null): Promise<Constraint> {
      const all = await parameters.listForDepot(companyId, depotId);
      const scope = depotId ?? all.find((parameter) => parameter.depotId)?.depotId ?? null;
      return toConstraint(scopeToDepot(all, scope));
    },

    async updateValues(companyId: string, input: unknown): Promise<DynamicParameterUpdateResult> {
      const updates = parse(dynamicParameterUpdatesSchema, input);
      const errors: DynamicParameterUpdateError[] = [];
      const results: DynamicParameter[] = [];

      await withTransaction(async (tx) => {
        for (const update of updates) {
          const parameter = await parameters.show(companyId, update.id, tx);
          if (!parameter) {
            errors.push({ id: update.id, message: 'Parameter not found' });
            continue;
          }
          const problem = problemWith(parameter, update.value);
          if (problem) {
            errors.push({ id: update.id, message: problem });
            continue;
          }
          await parameters.updateValue(companyId, update.id, String(update.value).trim(), tx);
          const saved = await parameters.show(companyId, update.id, tx);
          if (saved) results.push(saved);
        }
      });

      return { success: errors.length === 0, updatedCount: results.length, errors, results };
    },

    async updateConstraint(companyId: string, constraint: Constraint): Promise<Constraint> {
      const all = await parameters.listForDepot(companyId, null);
      const updates = all.flatMap((parameter) => {
        const value = constraint[constraintKey(parameter.keyName)];
        return value === undefined || value === null ? [] : [{ id: parameter.id, value }];
      });
      if (updates.length) {
        const outcome = await this.updateValues(companyId, updates);
        const [first] = outcome.errors;
        if (first) throw new AppError(first.message, 400, 'invalid_request');
      }
      return this.constraintFor(companyId, null);
    },

    async delete(companyId: string, id: string): Promise<{ success: boolean }> {
      if (!(await parameters.delete(companyId, id)))
        throw new AppError('Parameter not found', 404, 'not_found');
      return { success: true };
    },
  };
}

export type ParameterService = ReturnType<typeof createParameterService>;
