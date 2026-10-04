import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor() { }

  saveData<T>(key: string, data: T): void {
    sessionStorage.setItem(key, JSON.stringify(data));
  }

  getData<T>(key: string): Observable<T | null> {
    const data = sessionStorage.getItem(key);
    return of(data ? (JSON.parse(data) as T) : null);
  }

  clearData(key: string): void {
    sessionStorage.removeItem(key);
  }
}
