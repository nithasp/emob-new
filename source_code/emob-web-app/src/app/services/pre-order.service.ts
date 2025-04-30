import { Injectable } from '@angular/core';
import { map, Observable, retry } from 'rxjs';
import { Response } from '../models/graphql.model';
import gql from 'graphql-tag';
import { Apollo } from 'apollo-angular';
import { Experiment } from '../models/experiment.model';
import { ErrorHandlingService } from './handle-error.service';

@Injectable({
  providedIn: 'root'
})
export class PreOrderService {
  constructor(
    private readonly apollo: Apollo,
    private readonly errorHandlingService: ErrorHandlingService
    ) { }

  uploadPreOrder(runId: string, file: File): Observable<Experiment> {
    console.log("file", file);

    return this.apollo.mutate<Response>({
      mutation: gql`
        mutation uploadPreOrder($preorder: PreOrderInput!) {
          uploadPreOrder(input: $preorder) {
            name
            timestamp
            groupId
            result
            status
          }
        }
      `,
      variables: {
        preorder: {
          preOrderFile: file,
          runId: runId
        }
      },
      context: {
        useMultipart: true // Ensure multipart upload is enabled
      }
    }).pipe(retry(2),map(result => result.data!.uploadPreOrder),
    this.errorHandlingService.handleError);
  }
}
