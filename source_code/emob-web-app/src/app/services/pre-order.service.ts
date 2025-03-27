import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Response } from '../models/graphql.model';
import gql from 'graphql-tag';
import { Apollo } from 'apollo-angular';
import { Experiment } from '../models/experiment.model';

@Injectable({
  providedIn: 'root'
})
export class PreOrderService {
  constructor(private readonly apollo: Apollo) { }

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
    }).pipe(map(result => result.data!.uploadPreOrder));
  }
}
