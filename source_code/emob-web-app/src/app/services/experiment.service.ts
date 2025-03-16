import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import gql from 'graphql-tag';

import { Response } from '../models/graphql.model';
import { Experiment, ValidateExperiment } from '../models/experiment.model';
import { Constraint } from '../models/constraint.model';
import { Location } from '../models/location.model';
import { CustomerUpdated } from '../models/pre-order.model';

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
          runId
          name
          timestamp
          timeStart
          timeEnd
          timeDuration
          triggeredBy
          status
          run
          groupId
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
          runId
        }
      }`
    }).pipe(map(result => result.data!.createExperiment));
  }
  getExperiment(runId:string):Observable<Experiment>{
    return this.apollo.query<Response>({
      query: gql`
      query experiment($Id:RunIdInput!){
        experiment(input: $Id) {
          runId
          name
          timestamp
          timeStart
          timeEnd
          timeDuration
          triggeredBy
          status
          run
          groupId
        }
      }
      `,
      variables : {
        Id :{
          runId : runId
        }
        
      }
    }).pipe(map(result => result.data.experiment));
  }
  validateExperiment(runId: string,parameter:Constraint,locationUpdated:CustomerUpdated[]):Observable<ValidateExperiment>{
    return this.apollo.mutate<Response>({
      mutation: gql`
      mutation validateExperiment($validateInput:ExperimentInputValidation!){
        validateExperiment(input: $validateInput) {
            result
          }
        }`,
        variables: {
          validateInput : { 
            runId: runId, 
            parameter: parameter,
            updateLocation : {
              customers: locationUpdated
            }
          }
        }
    }).pipe(map(result => result.data!.validateExperiment));

  }
  submitExperiment(runId: string):Observable<Experiment>{
    return this.apollo.mutate<Response>({
      mutation: gql`
      mutation submitExperiment($input: ExperimentSubmitInput!){
        submitExperiment(input: $input) {
          runId
          name
          timestamp
          timeStart
          timeEnd
          timeDuration
          triggeredBy
          status
          run
          groupId
        }
      }
      `,
        variables: {
          input:{
            runId : runId
          }
          
        }
    }).pipe(map(result => result.data!.submitExperiment));

  }
}
