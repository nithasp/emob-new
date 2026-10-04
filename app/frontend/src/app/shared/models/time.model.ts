export interface TimeRangeValidatorConfig {
  startTimeField: string;
  endTimeField: string;
  startTimeErrorMessage?: string;
  endTimeErrorMessage?: string;
  errorKey?: string;
}

export class Time {
    hour: number = 0;
    minute:number = 0;
    
    constructor(hour:number,minute:number){
        this.hour = hour;
        this.minute = minute;
    }
    public toStringformat():string{
        return `${this.prependZero(this.hour)}:${this.prependZero(this.minute)}`
    }
    private prependZero(num:number) {
        if (num < 9)
            return "0" + num;
        else
            return num;
     }
}