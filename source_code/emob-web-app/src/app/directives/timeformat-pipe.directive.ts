import { ChangeDetectorRef, Pipe, PipeTransform } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

@Pipe({
  name: 'timeFormat',
  pure: false,
})
export class TimeFormatPipe implements PipeTransform {
  constructor(
    private transloco: TranslocoService,
    private cdr: ChangeDetectorRef
  ) {
    this.transloco.langChanges$.subscribe(() => this.cdr.markForCheck());
  }

  get currentLang(): string {
    return this.transloco.getActiveLang();
  }

  transform(value: string): string {
    if (!value) return '';

    const [hours, minutes] = value.split(':');
    let textValue: string = '';
    if (hours != '00') {
      textValue += `${Number(hours)} ${this.transloco.translate('hours')}`;
    }
    if (minutes != '00') {
      textValue += ` ${Number(minutes)} ${this.transloco.translate('minutes')}`;
    }
    if (minutes == '00' && hours == '00') {
      textValue = this.transloco.translate('not_set');
    }
    return textValue;
  }
}
