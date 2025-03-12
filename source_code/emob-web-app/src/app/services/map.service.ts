import { Injectable } from '@angular/core';
import * as ol from 'ol';
import { HttpClient, HttpHeaders } from "@angular/common/http";
@Injectable({
  providedIn: 'root'
})
export class MapService {

  constructor(
    private http : HttpClient
  ) { }

DetailLocation(lat:any,lon:any){

  return this.http.get("https://nominatim.openstreetmap.org/reverse?format=json&lon=" +
  lon +
    "&lat=" +
    lat);

}


  
}
