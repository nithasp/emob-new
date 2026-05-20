import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor() { }

  // Save data to session storage
  saveData<T>(key: string, data: T): void {
    sessionStorage.setItem(key, JSON.stringify(data));
  }

  // Retrieve data from session storage
  getData<T>(key: string): Observable<T | null> {
    const data = sessionStorage.getItem(key);
    return of(data ? (JSON.parse(data) as T) : null);
  }

  // Clear data from session storage
  clearData(key: string): void {
    sessionStorage.removeItem(key);
  }
}
