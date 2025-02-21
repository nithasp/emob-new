import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeFormat'
})
export class TimeFormatPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';

    const [hours, minutes] = value.split(':');
    let textValue:string = "";
    if(hours != '00'){
    textValue += `${Number(hours)} Hours`
    } 
    return `${textValue} ${minutes} Minutes`;
  }
}