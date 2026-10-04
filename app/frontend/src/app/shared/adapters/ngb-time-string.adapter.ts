import { Injectable } from '@angular/core';
import { NgbTimeAdapter, NgbTimeStruct } from '@ng-bootstrap/ng-bootstrap';

const pad = (i: number): string => (i < 10 ? `0${i}` : `${i}`);

@Injectable()
export class NgbTimeStringAdapter extends NgbTimeAdapter<string> {
  fromModel(value: string | null): NgbTimeStruct | null {
    if (value == null) {
      return null;
    }
    const trimmed = `${value}`.trim();
    if (!trimmed || trimmed.toLowerCase() === 'null') {
      return null;
    }
    const split = trimmed.split(':');
    const hour = parseInt(split[0] || '0', 10);
    const minute = parseInt(split[1] || '0', 10);
    const second: number | undefined =
      split.length > 2 ? parseInt(split[2] || '0', 10) : undefined;
    return {
      hour: isNaN(hour) ? 0 : hour,
      minute: isNaN(minute) ? 0 : minute,
      ...(typeof second === 'number' && !isNaN(second) ? { second } : {}),
    } as NgbTimeStruct;
  }

  toModel(time: NgbTimeStruct | null): string | null {
    return time != null ? `${pad(time.hour)}:${pad(time.minute)}` : null;
  }
}
