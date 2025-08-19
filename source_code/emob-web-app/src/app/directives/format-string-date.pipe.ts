import { Inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';
import { formatDate as angularFormatDate } from '@angular/common';

@Pipe({
  name: 'formatStringDate',
})
export class FormatStringDatePipe implements PipeTransform {
  constructor(@Inject(LOCALE_ID) private readonly defaultLocale: string) {}

  transform(
    value: Date | string | null | undefined,
    format: string = 'dd MMM yy h:mm:ss a',
    locale?: string,
    timezone?: string
  ): string {
    if (!value) return '';

    let date: Date;
    if (typeof value === 'string') {
      const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
      if (match) {
        const [, dd, mm, yyyy, HH, MM] = match;
        date = new Date(+yyyy, +mm - 1, +dd, +HH, +MM);
      } else {
        date = new Date(value);
      }
    } else {
      date = value;
    }

    if (isNaN(date.getTime())) return 'Invalid Date';

    const effectiveLocale = locale || this.defaultLocale || 'en-US';
    return angularFormatDate(date, format, effectiveLocale, timezone);
  }
}


