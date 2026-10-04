import { getNumberValue, isNumber } from './number-value.utils';

describe('isNumber() / getNumberValue()', () => {
  it('isNumber() handles null/undefined/objects/numeric strings', () => {
    expect(isNumber(null)).toBeFalse();
    expect(isNumber(undefined)).toBeFalse();
    expect(isNumber(42)).toBeTrue();
    expect(isNumber('42')).toBeTrue();
    expect(isNumber('abc')).toBeFalse();
    expect(isNumber({ toString: () => '5' })).toBeTrue();
  });

  it('getNumberValue() coerces booleans, numbers, objects, and strings', () => {
    expect(getNumberValue(null)).toBe(0);
    expect(getNumberValue(undefined)).toBe(0);
    expect(getNumberValue(true)).toBe(1);
    expect(getNumberValue(false)).toBe(0);
    expect(getNumberValue(3.5)).toBe(3.5);
    expect(getNumberValue('7')).toBe(7);
    expect(getNumberValue('abc')).toBe(0);
    expect(getNumberValue({ toString: () => '9' })).toBe(9);
  });
});
