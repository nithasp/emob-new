import { Pipe, PipeTransform } from '@angular/core';

export function timeStringToMinutes(
  time: string | null | undefined
): number | null {
  if (!time || typeof time !== 'string') return null;
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

@Pipe({
  name: 'timeStringToMinutes',
})
export class TimeStringToMinutesPipe implements PipeTransform {
  transform(value: string | null | undefined): number | null {
    return timeStringToMinutes(value);
  }
}
