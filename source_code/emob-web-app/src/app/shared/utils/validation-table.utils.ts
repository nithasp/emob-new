import { TranslocoService } from '@jsverse/transloco';
import { ValidationTableRow } from 'src/app/models/validation-table.model';

export function getValidationMessage(
  transloco: TranslocoService,
  type: string,
  params: any
): string {
  const scopedKey = `validation.${type}`;
  const translated = transloco.translate(scopedKey, params);
  if (!translated || translated === scopedKey || translated === type) {
    return transloco.translate('validation.unknown_validation_error', { errorType: type });
  }
  return translated;
}

export function buildTableRows(items: any[]): ValidationTableRow[] {
  const rows: ValidationTableRow[] = [];

  for (const item of items) {
    if (!item?.detail?.length) continue;

    for (const detail of item.detail) {
      rows.push({
        fileName: item.title,
        type: detail.type,
        params: buildTranslationParams(detail),
      });
    }
  }

  return rows;
}

export function buildTranslationParams(detail: any): Record<string, any> {
  const params: Record<string, any> = {};

  for (const [key, value] of Object.entries(detail)) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        params[`${key}[${index}]`] = item ?? '';
      });
    } else if (key === 'input') {
      params[key] = formatInputValue(value, detail.inputType);
    } else if (value !== null && typeof value === 'object') {
      params[key] = formatNestedValues(value as Record<string, any>);
    } else {
      params[key] = value ?? '';
    }
  }

  return params;
}

function formatInputValue(value: any, inputType?: string): string {
  if (value === null || value === undefined) return '';
  if (inputType === 'float' && typeof value === 'number') {
    return Number.isInteger(value) ? value.toFixed(1) : String(value);
  }
  return String(value);
}

function formatNestedValues(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = formatNestedValues(value);
    } else if (typeof value === 'number') {
      result[key] = Number.isInteger(value) ? value.toFixed(1) : String(value);
    } else {
      result[key] = value ?? '';
    }
  }

  return result;
}
