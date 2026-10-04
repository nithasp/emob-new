import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
@Injectable({
  providedIn: 'root'
})
export class MapService {

  constructor(
    private http : HttpClient
  ) { }

DetailLocation(lat:number,lon:number){

  return this.http.get("https://nominatim.openstreetmap.org/reverse?format=json&lon=" +
  lon +
    "&lat=" +
    lat);

}


  
}
