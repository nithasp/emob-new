import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from '../models/graphql.model';
import { ErrorHandlingService } from './handle-error.service';
import {
  MyVehicles,
  UpdateVehicleInput,
  VehicleType,
} from '../models/vehicle.model';

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

  getMyVehicleType(vehicleTypeId: string): Observable<VehicleType> {
    return this.apollo
      .query<Response>({
        query: gql`
          query myVehicle($vehicleTypeId: String!) {
            myVehicle(vehicleTypeId: $vehicleTypeId) {
              vehicleTypeId
              name
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

  createVehicle(input: UpdateVehicleInput): Observable<MyVehicles> {
    return this.apollo
      .mutate<Response>({
        mutation: gql`
          mutation createVehicle($input: CreateVehicleInput!) {
            createVehicle(input: $input) {
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
        variables: { input },
      })
      .pipe(
        map((result) => result.data?.createVehicle),
        this.errorHandlingService.handleError
      );
  }

  updateVehicle(
    vehicleIds: string,
    input: UpdateVehicleInput
  ): Observable<MyVehicles> {
    return this.apollo
      .mutate<Response>({
        mutation: gql`
          mutation updateVehicle(
            $vehicleIds: String!
            $input: UpdateVehicleInput!
          ) {
            updateVehicle(vehicleIds: $vehicleIds, input: $input) {
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
        variables: { vehicleIds, input },
      })
      .pipe(
        map((result) => result.data?.updateVehicle),
        this.errorHandlingService.handleError
      );
  }

  deleteVehicle(vehicleIds: string): Observable<boolean> {
    return this.apollo
      .mutate<Response>({
        mutation: gql`
          mutation deleteVehicle($vehicleIds: String!) {
            deleteVehicle(vehicleIds: $vehicleIds)
          }
        `,
        variables: { vehicleIds },
      })
      .pipe(
        map((result) => result.data?.deleteVehicle),
        this.errorHandlingService.handleError
      );
  }

  softDeleteVehicle(vehicleIds: string): Observable<MyVehicles> {
    return this.apollo
      .mutate<Response>({
        mutation: gql`
          mutation softDeleteVehicle($vehicleIds: String!) {
            softDeleteVehicle(vehicleIds: $vehicleIds) {
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
        variables: { vehicleIds },
      })
      .pipe(
        map((result) => result.data?.softDeleteVehicle),
        this.errorHandlingService.handleError
      );
  }

  createVehicleType(input: VehicleType): Observable<VehicleType> {
    return this.apollo
      .mutate<Response>({
        mutation: gql`
          mutation createVehicleType($input: CreateVehicleTypeInput!) {
            createVehicleType(input: $input) {
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
        variables: { input },
      })
      .pipe(
        map((result) => result.data?.createVehicleType),
        this.errorHandlingService.handleError
      );
  }

  updateVehicleType(
    vehicleTypeId: string,
    input: VehicleType
  ): Observable<VehicleType> {
    return this.apollo
      .mutate<Response>({
        mutation: gql`
          mutation updateVehicleType(
            $vehicleTypeId: String!
            $input: UpdateVehicleTypeInput!
          ) {
            updateVehicleType(vehicleTypeId: $vehicleTypeId, input: $input) {
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
        variables: { vehicleTypeId, input },
      })
      .pipe(
        map((result) => result.data?.updateVehicleType),
        this.errorHandlingService.handleError
      );
  }

  deleteVehicleType(vehicleTypeId: string): Observable<boolean> {
    return this.apollo
      .mutate<Response>({
        mutation: gql`
          mutation deleteVehicleType($vehicleTypeId: String!) {
            deleteVehicleType(vehicleTypeId: $vehicleTypeId)
          }
        `,
        variables: { vehicleTypeId },
      })
      .pipe(
        map((result) => result.data?.deleteVehicleType),
        this.errorHandlingService.handleError
      );
  }
}
