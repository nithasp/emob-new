import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'snakeCase',
  pure: true
})
export class SnakeCasePipe implements PipeTransform {
  transform(value: string): string {
    if (typeof value !== 'string') {
      return value;
    }
    return value
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
}