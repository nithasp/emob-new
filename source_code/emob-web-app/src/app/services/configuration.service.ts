import { HttpClient, } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from '../models/graphql.model';
import type { Error } from '../models/graphql.model';
import { ActualLocation, Configuration } from '../models/configuration.model';

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
  getConfigurations(): Observable<Response> {
    return this.apollo
      .query<Response>({
        query: gql`
                  
          {
            configurations {
              id
              timestamp
              name
              category
              type
            }
            actualLocations {
              year
              children {
                month
                children {
                fileName
                timestamp
                fileBlobPath
              }
            }
          }
          }
        `,
      })
      .pipe(
        map(result => result.data)
      );
  }

  getConfiguration(id:string): Observable<Configuration> {
    return this.apollo
      .query<Response>({
        query: gql`
        query configuration($id:String!) {
                configuration(id:$id) {
                  fileUrl {
                    fileConfigurationUrl
                  }
                }
              }

        `,
        variables:{
            id:id,
      }
    })
      .pipe(
        map(result => result.data.configuration)
      );
  }

  getActualLocation(blobPath:string): Observable<ActualLocation>{
    return this.apollo.query<Response>({
      query: gql`
        query actualLocation($input:String!){
          actualLocation(blobPath: $input) {
            year
            children {
              month
              children{
              fileName
              fileBlobPath
              timestamp
              fileUrl {
                fileActualLocationUrl
              }
            }
          }
        }
          }
      `,
      variables: {
        input: blobPath
      }
    }).pipe(
      map(result => result.data.actualLocation)
    );
  }


  uploadActualLocation(file: File): Observable<ActualLocation> {
    console.log("file", file);

    return this.apollo.mutate<Response>({
      mutation: gql`
      mutation uploadActualLocation($input: Upload!){
        uploadActualLocation(file: $input) {
          year
          children {
            month
            children{
              fileName
              fileBlobPath
              timestamp
              fileUrl {
                fileActualLocationUrl
              }
            }
          }
        }
      }
      `,
      variables: {
        input: file
      },
      context: {
        useMultipart: true // Ensure multipart upload is enabled
      }
    }).pipe(map(result => result.data!.uploadActualLocation));
  }

  uploadConfiguration(file: File,category:string,type:string): Observable<Configuration> {
    return this.apollo.mutate<Response>({
      mutation: gql`
      mutation replaceTypeOfCategory($input:replaceCategoryInput!){
        replaceTypeOfCategory(input:$input) {
          companyName
          id
          timestamp
          name
          category
          type
          fileBlobPath
        }
      }
      `,
      variables: {
        input : {
          file: file,
          category: category,
          type: type
        }
      },
      context: {
        useMultipart: true // Ensure multipart upload is enabled
      }
    }).pipe(
      map(result =>{
        if (result.errors as Error[]) {
          // Handle errors here
          console.error(result.errors);
          throw new Error(`${result.errors?.map(error => error.message).join(', ')}`);
        }
  
        return result.data!.replaceTypeOfCategory;
      }));
  }


}

