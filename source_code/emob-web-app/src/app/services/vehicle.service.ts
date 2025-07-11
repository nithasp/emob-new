import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from '../models/graphql.model';
import { ErrorHandlingService } from './handle-error.service';
import { MyVehicles, VehicleType } from '../models/vehicle.model';

@Injectable({
  providedIn: 'root',
})
export class VehicleService {
  constructor(
    private readonly apollo: Apollo,
    private readonly errorHandlingService: ErrorHandlingService
  ) {}

  getMyVehicles(): Observable<MyVehicles[]> {
    return this.apollo
      .query<Response>({
        query: gql`
          query myVehicles {
            myVehicles {
              companyName
              vehicleIds
              licensePlate
              startDepotId
              endDepotId
              vehicleTypeId
              vehicleType {
                vehicleTypeId
                name
                width
                height
                length
                access
                capacity
                volume
                twEarly
                twLate
                maxDistance
                maxDuration
                fixedCost
                unitDistanceCost
                unitDurationCost
                vehicleProfileType
                createdAt
                modifiedAt
              }
              isActive
              createdAt
              modifiedAt
            }
          }
        `,
      })
      .pipe(
        map((result) => result.data.myVehicles),
        this.errorHandlingService.handleError
      );
  }

  getMyVehicle(vehicleIds: string): Observable<MyVehicles> {
    return this.apollo
      .query<Response>({
        query: gql`
          query myVehicle($vehicleIds: String!) {
            myVehicle(vehicleIds: $vehicleIds) {
              companyName
              vehicleIds
              licensePlate
              startDepotId
              endDepotId
              vehicleTypeId
              vehicleType {
                vehicleTypeId
                name
                width
                height
                length
                access
                capacity
                volume
                twEarly
                twLate
                maxDistance
                maxDuration
                fixedCost
                unitDistanceCost
                unitDurationCost
                vehicleProfileType
                createdAt
                modifiedAt
              }
              isActive
              createdAt
              modifiedAt
            }
          }
        `,
        variables: {
          vehicleIds: vehicleIds,
        },
      })
      .pipe(
        map((result) => result.data.myVehicle),
        this.errorHandlingService.handleError
      );
  }

  getMyVehicleType(vehicleTypeId: string): Observable<VehicleType> {
    return this.apollo
      .query<Response>({
        query: gql`
          query myVehicle($vehicleTypeId: String!) {
            myVehicle(vehicleTypeId: $vehicleTypeId) {
              vehicleTypeId
              name
              width
              height
              length
              access
              capacity
              volume
              twEarly
              twLate
              maxDistance
              maxDuration
              fixedCost
              unitDistanceCost
              unitDurationCost
              vehicleProfileType
              createdAt
              modifiedAt
            }
          }
        `,
        variables: {
          vehicleTypeId: vehicleTypeId,
        },
      })
      .pipe(
        map((result) => result.data.myVehicleType),
        this.errorHandlingService.handleError
      );
  }

  getMyVehicleTypes(): Observable<VehicleType[]> {
    return this.apollo
      .query<Response>({
        query: gql`
          query myVehicleTypes {
            myVehicleTypes {
              vehicleTypeId
              name
              width
              height
              length
              access
              capacity
              volume
              twEarly
              twLate
              maxDistance
              maxDuration
              fixedCost
              unitDistanceCost
              unitDurationCost
              vehicleProfileType
              createdAt
              modifiedAt
            }
          }
        `,
      })
      .pipe(
        map((result) => result.data.myVehicleTypes),
        this.errorHandlingService.handleError
      );
  }
}
