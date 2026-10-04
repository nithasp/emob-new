import { NumberValue } from '../../models/location.model';

export function isNumber(value: NumberValue): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'object') {
    const stringValue = String(value);
    return !isNaN(Number(stringValue));
  }

  return !isNaN(Number(value));
}

export function getNumberValue(value: NumberValue): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'object') {
    const stringValue = String(value);
    const numValue = Number(stringValue);
    return isNaN(numValue) ? 0 : numValue;
  }

  const numValue = Number(value);
  return isNaN(numValue) ? 0 : numValue;
}
