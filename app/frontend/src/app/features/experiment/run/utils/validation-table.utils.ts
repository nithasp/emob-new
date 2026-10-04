import { TranslocoService } from '@jsverse/transloco';
import {
  ValidationWarningInput,
  WarningDetail,
} from 'src/app/models/experiment.model';
import {
  ValidationParams,
  ValidationTableRow,
} from 'src/app/models/validation-table.model';

export function getValidationMessage(
  transloco: TranslocoService,
  type: string,
  params: ValidationParams
): string {
  const scopedKey = `validation.${type}`;
  const translated = transloco.translate(scopedKey, params);
  if (!translated || translated === scopedKey || translated === type) {
    return transloco.translate('validation.unknown_validation_error', { errorType: type });
  }
  return translated;
}

export function createCachedValidationMessageFn(transloco: TranslocoService) {
  const cache = new Map<string, string>();

  return (type: string, params: ValidationParams): string => {
    const cacheKey = `${type}::${JSON.stringify(params)}`;
    const cached = cache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    const message = getValidationMessage(transloco, type, params);
    cache.set(cacheKey, message);
    return message;
  };
}

export function buildTableRows(items: ValidationWarningInput[]): ValidationTableRow[] {
  const rows: ValidationTableRow[] = [];

  for (const item of items) {
    if (!item?.detail?.length) continue;

    for (const detail of item.detail) {
      rows.push({
        fileName: item.title ?? '',
        type: detail.type ?? '',
        params: buildTranslationParams(detail),
      });
    }
  }

  return rows;
}

export function buildTranslationParams(detail: WarningDetail): ValidationParams {
  const params: ValidationParams = {};

  for (const [key, value] of Object.entries(detail)) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        params[`${key}[${index}]`] = item ?? '';
      });
    } else if (key === 'input') {
      params[key] = formatInputValue(value, detail.inputType);
    } else if (value !== null && typeof value === 'object') {
      params[key] = formatNestedValues(value as Record<string, unknown>);
    } else {
      params[key] = value ?? '';
    }
  }

  return params;
}

function formatInputValue(value: unknown, inputType?: string): string {
  if (value === null || value === undefined) return '';
  if (inputType === 'float' && typeof value === 'number') {
    return Number.isInteger(value) ? value.toFixed(1) : String(value);
  }
  return String(value);
}

function formatNestedValues(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = formatNestedValues(value as Record<string, unknown>);
    } else if (typeof value === 'number') {
      result[key] = Number.isInteger(value) ? value.toFixed(1) : String(value);
    } else {
      result[key] = value ?? '';
    }
  }

  return result;
}
