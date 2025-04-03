import { HttpClient, } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom, Observable } from 'rxjs';
import { map, retry } from 'rxjs/operators';
import { Response } from '../models/graphql.model';
import type { Error } from '../models/graphql.model';
import { ActualLocation, Configuration } from '../models/configuration.model';
import { ErrorHandlingService } from './handle-error.service';

@Injectable({
  providedIn: 'root',
})
export class ConfigurationService {
  constructor(
    private readonly apollo: Apollo,
    private readonly http: HttpClient,
    private readonly errorHandlingService: ErrorHandlingService
  ) {}


  getDatafromUrl(url:string): Observable<Blob>{
    return this.http.get(url, { responseType: 'blob' });
  }

  async downloadFile(url: string): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get(url, { responseType: 'blob', observe: 'response' }).pipe(this.errorHandlingService.handleError)
      );

      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = 'downloadedFile';
      if (contentDisposition) {
        const matches = /filename="([^"]*)"/.exec(contentDisposition);
        if (matches && matches.length > 0) {
          fileName = matches[1];
        }
      }

      const blob = response.body;
      if (blob) {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(link.href);
      } else {
        console.error('Download failed: Blob is null');
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
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
        map(result => result.data),
        this.errorHandlingService.handleError
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
        map(result => result.data.configuration),
        this.errorHandlingService.handleError
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
    }).pipe(map(result => result.data!.uploadActualLocation),
    this.errorHandlingService.handleError);
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
      map(result => result.data!.replaceTypeOfCategory),
      this.errorHandlingService.handleError);
  }


}

