const TIME_PATTERN = /^(\d{1,3}):([0-5]\d)$/;

export const isTimeString = (value: unknown): value is string =>
  typeof value === 'string' && TIME_PATTERN.test(value.trim());

export function timeToMinutes(value: string | null | undefined, fallback = 0): number {
  const match = TIME_PATTERN.exec((value ?? '').trim());
  if (!match) return fallback;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function minutesToTime(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes));
  const hours = Math.floor(whole / 60);
  return `${String(hours).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}
