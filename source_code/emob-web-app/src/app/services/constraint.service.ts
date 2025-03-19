import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import gql from 'graphql-tag';

import {Constraint } from '../models/constraint.model'
import { Response } from '../models/graphql.model';

@Injectable({
  providedIn: 'root'
})
export class ConstraintService {

  constructor(private readonly apollo : Apollo) { }

  getParameter():Observable<Constraint>{
    return this.apollo.query<Response>({
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
    
    `
    }).pipe(
      map(result => result.data.myParameter)
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
      map(result => result.data!)
    )
  }
}
