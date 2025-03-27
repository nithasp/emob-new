import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http'; 


@Injectable({
    providedIn: 'root'
  })

  export class LocationService {

    constructor(private readonly http: HttpClient) {
      this.getJSON().subscribe(data => {
          console.log(data);
      });
  }


   public getJSON(): Observable<any> {
    return this.http.get("./assets/depots_routes_geo.json");
}
  getReport(): Observable<any> {
    return this.http.get('./assets/report_20250323_180154.csv', { responseType: 'text' })
  }
  
}