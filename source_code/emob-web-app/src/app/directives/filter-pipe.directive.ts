import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filter'
})
export class FilterPipe implements PipeTransform {
  transform(items: any[], searchText: string, headers: string[]): any[] {
    if (!items) return [];
    if (!searchText) return items;
    const searchTerms = searchText.split(',').map(term => term.trim().toLowerCase());
    return items.filter(item => {
      return headers.some(header => {
        return searchTerms.some(term => item[header] && item[header].toString().toLowerCase().includes(term));
      });
    });
  }
}