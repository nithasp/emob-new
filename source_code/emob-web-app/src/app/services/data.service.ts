import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor() { }

  // Save data to session storage
  saveData(key:string,data: any): void {
    sessionStorage.setItem(key, JSON.stringify(data));
  }

  // Retrieve data from session storage
  getData(key:string): Observable<any>  {
    const data = sessionStorage.getItem(key);
    return of(data ? JSON.parse(data) : null);
  }

  // Clear data from session storage
  clearData(key:string): void {
    sessionStorage.removeItem(key);
  }
}
