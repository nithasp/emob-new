import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable, ObservableInput, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import gql from 'graphql-tag';

import { Response } from '../models/graphql.model';
import { Experiment, ExperimentState } from '../models/experiment.model';
import { Constraint } from '../models/constraint.model';
import { Location } from '../models/location.model';
import { CustomerUpdated } from '../models/pre-order.model';
import type {Error} from '../models/graphql.model';
import { ToastrService } from 'ngx-toastr';
import { ErrorHandlingService  } from './handle-error.service';

@Injectable({
  providedIn: 'root'
})
export class ExperimentService {

  constructor(private readonly apollo : Apollo,
    private readonly toastr: ToastrService,
    private readonly errorHandlingService: ErrorHandlingService
    ) { }
  
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
          triggeredByName
          status
          run
          groupId
          countGeocoding
          countReroute
        }
      }
    `,
    fetchPolicy: 'cache-and-network'
    }).valueChanges.pipe(
      map(result => result.data.experiments),this.errorHandlingService.handleError);
  }

  createExperiment():Observable<Experiment>{
    return this.apollo.mutate<Response>({
      mutation: gql`
      mutation {
        createExperiment {
          runId
        }
      }`
    }).pipe(map(result => result.data!.createExperiment),this.errorHandlingService.handleError);
  }
  getExperiment(runId:string):Observable<Experiment>{
    return this.apollo.watchQuery<Response>({
      query: gql`
      query experiment($Id:RunIdInput!){
        experiment(input: $Id) {
          runId
          name
          timestamp
          preOrderBlobPath
          locationBlobPath
          locationUpdateBlobPath
          validatedBlobPath
          parameterBlobPath
          outputRouteOptimizationBlobPath
          triggeredBy
          timeEnd
          timeStart
          status
          run
          groupId
          fileUrl {
            parameterUrl
            preOrderUrl
            outputRouteOptimizationBlobPathUrl
            LocationBlobPathUrl
            locationUpdateBlobPathUrl
            validatedBlobPathUrl
          }
        }
      }
      `,
      variables : {
        Id :{
          runId : runId
        }
        
      },
      fetchPolicy: 'cache-and-network'
    }).valueChanges.pipe(map(result => result.data.experiment),this.errorHandlingService.handleError);
  }
  validateExperiment(runId: string,parameter:Constraint,locationUpdated:CustomerUpdated[]):Observable<Experiment>{
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
    }).pipe(map(result => result.data!.validateExperiment),this.errorHandlingService.handleError);

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
          triggeredByName
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
    }).pipe(map(result => result.data!.submitExperiment),this.errorHandlingService.handleError);

  }


  rerunExperiment(runId: string):Observable<ExperimentState>{
    return this.apollo.mutate<Response>({
      mutation: gql`
      mutation rerunExperiment($runId: String!){
        rerunExperiment(runId: $runId) {
          runId
          message
          statusCode
          status
          groupId
        }
      }
      
      `,
        variables: {
            runId : runId
        }
    }).pipe(map(result => result.data!.rerunExperiment),this.errorHandlingService.handleError);

  }

  cancelExperiment(runId: string):Observable<ExperimentState>{
    return this.apollo.mutate<Response>({
      mutation: gql`
      mutation cancelExperiment($runId: String!){
        cancelExperiment(runId: $runId) {
          runId
          message
          statusCode
          status
          groupId
        }
      }
      
      `,
        variables: {
            runId : runId
        }
    }).pipe(map(result => result.data!.cancelExperiment),this.errorHandlingService.handleError);

  }

  replicateExperiment(runId: string):Observable<Experiment>{
    return this.apollo.mutate<Response>({
      mutation: gql`
      mutation replicateExperiment($runId: String!){
        replicateExperiment(runId: $runId) {
          runId
        }
      }      
      `,
        variables: {
            runId : runId
        }
    }).pipe(map(result => result.data!.replicateExperiment),this.errorHandlingService.handleError);

  }
}
