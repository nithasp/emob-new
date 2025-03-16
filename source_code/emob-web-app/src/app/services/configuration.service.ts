import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from '../models/graphql.model';
import { Configuration } from '../models/configuration.model';

@Injectable({
  providedIn: 'root',
})
export class ConfigurationService {
  constructor(
    private readonly apollo: Apollo,
    private readonly http: HttpClient
  ) {}


  getDatafromUrl(url:string): Observable<Blob>{
    return this.http.get(url, { responseType: 'blob' });
  }
  getConfiguration(): Observable<Configuration> {
    return this.apollo
      .query<Response>({
        query: gql`
        query Configuration {
            configuration {
              inventories {
                category
                id
                name
                timestamp
                fileUrl {
                  fileInventoryUrl
                }
              }
            }
          }
        `,
      })
      .pipe(
        map(result => result.data.configuration)
      );
  }
}

