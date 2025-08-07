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

  uploadPreOrder(runId: string, depotIds: string[], preOrderFiles: { file: File, keyName: string }[]): Observable<Experiment> {
    return this.apollo.mutate<Response>({
      mutation: gql`
        mutation uploadPreOrder($input: PreOrderInput!) {
          uploadPreOrder(input: $input) {
            name
            timestamp
            groupId
            result
            status
          }
        }
      `,
      variables: {
        input: {
          runId: runId,
          depotId: depotIds,
          preOrderFiles: preOrderFiles
        }
      },
      context: {
        useMultipart: true
      }
    }).pipe(
      retry(2),
      map(result => result.data!.uploadPreOrder),
      this.errorHandlingService.handleError
    );
  }
}
