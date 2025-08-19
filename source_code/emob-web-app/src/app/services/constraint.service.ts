import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import gql from 'graphql-tag';

import {Constraint } from '../models/constraint.model'
import { Response } from '../models/graphql.model';
import { ErrorHandlingService } from './handle-error.service';

@Injectable({
  providedIn: 'root'
})
export class ConstraintService {

  constructor(private readonly apollo : Apollo,
    private readonly errorHandlingService: ErrorHandlingService
    ) { }

  getMyParameter():Observable<Constraint>{
    return this.apollo.
    query<Response>({
      query: gql`
      query MyParameter {
        myParameter {
          earlyDeliveryTime
          backToDepotTime
          maximumWorkDuration
          numberOfVehicleAvailable
          vehicleOrderSizeCapacity
          maximumTravelDistance
          serviceDurationTime
        }
      }
    
    `,
    fetchPolicy: 'network-only',
    }).pipe(
      map(result => result.data.myParameter),
      this.errorHandlingService.handleError
    )
  }

  getParameter(runID:string):Observable<Constraint>{
    return this.apollo.query<Response>({
      query: gql`
      query parameter($runID:String!){
        parameter(experimentRunID: $runID) {
          earlyDeliveryTime
          backToDepotTime
          maximumWorkDuration
          numberOfVehicleAvailable
          vehicleOrderSizeCapacity
          maximumTravelDistance
          serviceDurationTime
        }
      }
    
    `,
    variables:{
      runID:runID
    }
    }).pipe(
      map(result => result.data.parameter),
      this.errorHandlingService.handleError
    )
  }

  updateParameter(constraints:Constraint): Observable<Response>{
    return this.apollo.mutate<Response>({
      mutation: gql`
      mutation updateParameter( $constraints : ParameterInput!){
        updateParameter(parameter: $constraints) {
          earlyDeliveryTime
          backToDepotTime
          maximumWorkDuration
          numberOfVehicleAvailable
          vehicleOrderSizeCapacity
          maximumTravelDistance
          serviceDurationTime
        }
      }
    
    `,
    variables: {
      constraints: constraints
    }
    }).pipe(
      map(result => result.data!),
      this.errorHandlingService.handleError
    )
  }
}
