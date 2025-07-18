import { Pipe, PipeTransform } from '@angular/core';

export function timeStringToMinutes(
  time: string | null | undefined
): number | null {
  if (!time || typeof time !== 'string') return null;
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

export function minutesToTimeString(
  minutes: number | null | undefined
): string {
  if (minutes === null || minutes === undefined || typeof minutes !== 'number') {
    return '';
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

@Pipe({
  name: 'timeStringToMinutes',
})
export class TimeStringToMinutesPipe implements PipeTransform {
  transform(value: string | null | undefined): number | null {
    return timeStringToMinutes(value);
  }
}
