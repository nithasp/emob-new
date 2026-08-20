import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from '../models/graphql.model';
import type { Error } from '../models/graphql.model';
import { ActualLocation, Configuration } from '../models/configuration.model';
import { ErrorHandlingService } from './handle-error.service';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root',
})
export class ConfigurationService {
  private readonly logger = inject(LoggerService);

  constructor(
    private readonly apollo: Apollo,
    private readonly http: HttpClient,
    private readonly errorHandlingService: ErrorHandlingService
  ) {}

  getDatafromUrl(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob' });
  }

  downloadFile(url: string): Observable<HttpResponse<Blob>> {
    return this.http.get(url, { responseType: 'blob', observe: 'response' });
  }

  getConfigurations(): Observable<Response> {
    return this.apollo
      .watchQuery<Response>({
        query: gql`
          {
            configurations {
              companyName
              id
              timestamp
              name
              category
              type
              depotId
              fileBlobPath
              columns
              replace
              depot {
                companyName
                depotId
                depotName
                latitude
                longitude
                timeWindowEarly
                timeWindowLate
                createdAt
                updatedAt
              }
              fileUrl {
                fileConfigurationUrl
              }
            }
          }
        `,
        fetchPolicy: 'cache-and-network',
        notifyOnNetworkStatusChange: true,
      })
      .valueChanges.pipe(
        map((result) => result.data),
        this.errorHandlingService.handleError
      );
  }

  getConfiguration(id: string): Observable<Configuration> {
    return this.apollo
      .query<Response>({
        query: gql`
          query configuration($id: String!) {
            configuration(id: $id) {
              fileUrl {
                fileConfigurationUrl
              }
            }
          }
        `,
        variables: {
          id: id,
        },
      })
      .pipe(
        map((result) => result.data.configuration),
        this.errorHandlingService.handleError
      );
  }

  getActualLocation(blobPath: string): Observable<ActualLocation> {
    return this.apollo
      .query<Response>({
        query: gql`
          query actualLocation($input: String!) {
            actualLocation(blobPath: $input) {
              year
              children {
                month
                children {
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
          input: blobPath,
        },
      })
      .pipe(map((result) => result.data.actualLocation));
  }

  uploadActualLocation(file: File): Observable<ActualLocation> {
    this.logger.log('file', file);

    return this.apollo
      .mutate<Response>({
        mutation: gql`
          mutation uploadActualLocation($input: Upload!) {
            uploadActualLocation(file: $input) {
              year
              children {
                month
                children {
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
          input: file,
        },
        context: {
          useMultipart: true, // Ensure multipart upload is enabled
        },
      })
      .pipe(
        map((result) => result.data!.uploadActualLocation),
        this.errorHandlingService.handleError
      );
  }

  uploadConfiguration(file: File, id: string): Observable<Configuration> {
    return this.apollo
      .mutate<Response>({
        mutation: gql`
          mutation replaceTypeOfCategory($input: replaceCategoryInput!) {
            replaceTypeOfCategory(input: $input) {
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
          input: {
            file: file,
            id: id,
          },
        },
        context: {
          useMultipart: true, // Ensure multipart upload is enabled
        },
      })
      .pipe(
        map((result) => result.data!.replaceTypeOfCategory),
        this.errorHandlingService.handleError
      );
  }
}
