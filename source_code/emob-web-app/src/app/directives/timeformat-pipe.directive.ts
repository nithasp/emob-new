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
    if(minutes != '00'){
      textValue += ` ${Number(minutes)} Minutes`
      }
    if(minutes =='00' && hours == '00'){
      textValue = "Not Set"
    } 
    return textValue;
  }
}