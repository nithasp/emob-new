import { NgbTimeStringAdapter } from './ngb-time-string.adapter';

describe('NgbTimeStringAdapter', () => {
  const adapter = new NgbTimeStringAdapter();

  it('fromModel() parses "HH:mm" and "HH:mm:ss" strings', () => {
    expect(adapter.fromModel('08:30')).toEqual({ hour: 8, minute: 30 } as any);
    expect(adapter.fromModel('08:30:15')).toEqual({
      hour: 8,
      minute: 30,
      second: 15,
    } as any);
  });

  it('fromModel() returns null for null/empty/"null" values', () => {
    expect(adapter.fromModel(null)).toBeNull();
    expect(adapter.fromModel('')).toBeNull();
    expect(adapter.fromModel('null')).toBeNull();
  });

  it('fromModel() defaults unparsable segments to 0', () => {
    expect(adapter.fromModel('abc:def')).toEqual({
      hour: 0,
      minute: 0,
    } as any);
  });

  it('toModel() pads hour/minute and returns null for null input', () => {
    expect(adapter.toModel({ hour: 8, minute: 5, second: 0 })).toBe('08:05');
    expect(adapter.toModel(null)).toBeNull();
  });
});
