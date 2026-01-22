import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filter'
})
export class FilterPipe implements PipeTransform {
  transform<T extends Record<string, unknown>>(items: T[], searchText: string, headers: string[]): T[] {
    if (!items) return [];
    if (!searchText) return items;
    const searchTerms: string[] = searchText.split(',').map((term: string) => term.trim().toLowerCase());
    return items.filter((item: T) => {
      return headers.some((header: string) => {
        const value = item[header];
        return searchTerms.some((term: string) => value && value.toString().toLowerCase().includes(term));
      });
    });
  }
}