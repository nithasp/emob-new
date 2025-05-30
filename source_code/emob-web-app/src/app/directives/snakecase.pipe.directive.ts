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
      .toLowerCase()
      // replace any sequence of non-alphanumeric chars with a single underscore
      .replace(/[^a-z0-9]+/g, '_')
      // trim leading/trailing underscores
      .replace(/^_+|_+$/g, '');
  }
}