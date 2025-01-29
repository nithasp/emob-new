import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import gql from 'graphql-tag';

import { Response } from '../models/graphql.model';
import { Experiment } from '../models/experiment.model';

@Injectable({
  providedIn: 'root'
})
export class ExperimentService {

  constructor(private readonly apollo : Apollo) { }

  getExperiments():Observable<Array<Experiment>>{
    return this.apollo.watchQuery<Response>({
      query: gql`
      query {
        experiments {
          RunId
          Name
          Timestamp
          TimeStart
          TimeEnd
          TimeDulatin
          TriggeredBy
          Status
          Run
          GroupId
        }
      }
    `,
    fetchPolicy: 'cache-and-network'
    }).valueChanges.pipe(
      map(result => result.data.experiments)
    );
  }

  createExperiment():Observable<Experiment>{
    return this.apollo.mutate<Response>({
      mutation: gql`
      mutation {
        createExperiment {
          RunId
        }
      }`
    }).pipe(map(result => result.data!.createExperiment));
  }
  getExperiment(RunId:string):Observable<Experiment>{
    return this.apollo.query<Response>({
      query: gql`
      query experiment($Id:RunId!){
        experiment(input: $Id) {
          RunId
          Name
          Timestamp
          TimeStart
          TimeEnd
          TimeDulatin
          TriggeredBy
          Status
          Run
          GroupId
        }
      }
      `,
      variables : {
        Id :{
          RunId : RunId
        }
        
      }
    }).pipe(map(result => result.data.experiment));
  }
}
