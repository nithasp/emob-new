import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from '../models/graphql.model';
import { ErrorHandlingService } from './handle-error.service';
import { myVehicles } from '../models/vehicle.model';

@Injectable({
  providedIn: 'root',
})
export class VehicleService {
  constructor(
    private readonly apollo: Apollo,
    private readonly errorHandlingService: ErrorHandlingService
  ) {}

  getMyVehicles(): Observable<myVehicles[]> {
    return this.apollo
      .query<Response>({
        query: gql`
          query MyVehicles {
            myVehicles {
              companyName
              licensePlate
              vehicleName
              vehicleType
              vehicleBrand
              vehicleModel
              vehicleWeight
              maxLoadWeight
              cargoWidth
              cargoLength
              cargoHeight
              maxPalletCount
              isActive
            }
          }
        `,
      })
      .pipe(
        map((result) => result.data.myVehicles),
        this.errorHandlingService.handleError
      );
  }
}
