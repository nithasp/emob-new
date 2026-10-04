import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from '@core/models/graphql.model';
import { ErrorHandlingService } from '@core/services/handle-error.service';
import {
  MyVehicles,
  VehicleEnumOption,
  VehicleType,
  VehicleInput,
  VehicleUpdateInput,
  VehicleCreationResult,
} from '../models/vehicle.model';

@Injectable({ providedIn: 'root' })
export class VehicleService {
  constructor(
    private readonly apollo: Apollo,
    private readonly errorHandlingService: ErrorHandlingService
  ) {}

  getEnumValues(enumName: string): Observable<VehicleEnumOption[]> {
    return this.apollo
      .query<Response>({
        query: gql`
          query getEnumValues($enumName: String!) {
            getEnumValues(enumName: $enumName)
          }
        `,
        variables: {
          enumName: enumName,
        },
      })
      .pipe(
        map((result) => result.data.getEnumValues),
        this.errorHandlingService.handleError
      );
  }

  getMyVehicles(depotId?: string, vehicleTypeId?: string): Observable<MyVehicles[]> {
    return this.apollo
      .query<Response>({
        query: gql`
          query myVehicles($depotId: String, $vehicleTypeId: String) {
            myVehicles(depotId: $depotId, vehicleTypeId: $vehicleTypeId) {
              companyName
              vehicleId
              licensePlate
              startDepotId {
                companyName
                depotId
                depotName
                latitude
                longitude
                timeWindowEarly
                timeWindowLate
                createdAt
                updatedAt
                inputdata {
                  companyName
                  depotId
                  keyName
                  displayName
                  columnRequired
                  fileFormatType
                  createdAt
                  modifiedAt
                }
              }
              endDepotId {
                companyName
                depotId
                depotName
                latitude
                longitude
                timeWindowEarly
                timeWindowLate
                createdAt
                updatedAt
                inputdata {
                  companyName
                  depotId
                  keyName
                  displayName
                  columnRequired
                  fileFormatType
                  createdAt
                  modifiedAt
                }
              }
              vehicleType {
                vehicleTypeId
                name
                access
                allowedBreaks {
                  duration
                  timeWindowEarly
                  timeWindowLate
                  name
                }
                dimension {
                  width
                  height
                  depth
                }
                maximumWeightCapacity
                maximumVolumeCapacity
                timeWindowEarly
                timeWindowLate
                maximumDistance
                maximumDuration
                vehicleGroupId
                fixedCost
                unitDistanceCost
                unitDurationCost
                vehicleProfileType
                isVehicleAvailable
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
          depotId,
          vehicleTypeId,
        },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => result.data.myVehicles),
        this.errorHandlingService.handleError
      );
  }

  getMyVehicle(vehicleId: string): Observable<MyVehicles> {
    return this.apollo
      .query<Response>({
        query: gql`
          query myVehicle($vehicleId: String!) {
            myVehicle(vehicleId: $vehicleId) {
              companyName
              vehicleId
              licensePlate
              startDepotId {
                companyName
                depotId
                depotName
                latitude
                longitude
                timeWindowEarly
                timeWindowLate
                createdAt
                updatedAt
                inputdata {
                  companyName
                  depotId
                  keyName
                  displayName
                  columnRequired
                  fileFormatType
                  createdAt
                  modifiedAt
                }
              }
              endDepotId {
                companyName
                depotId
                depotName
                latitude
                longitude
                timeWindowEarly
                timeWindowLate
                createdAt
                updatedAt
                inputdata {
                  companyName
                  depotId
                  keyName
                  displayName
                  columnRequired
                  fileFormatType
                  createdAt
                  modifiedAt
                }
              }
              vehicleType {
                vehicleTypeId
                name
                access
                allowedBreaks {
                  duration
                  timeWindowEarly
                  timeWindowLate
                  name
                }
                dimension {
                  width
                  height
                  depth
                }
                maximumWeightCapacity
                maximumVolumeCapacity
                timeWindowEarly
                timeWindowLate
                maximumDistance
                maximumDuration
                vehicleGroupId
                fixedCost
                unitDistanceCost
                unitDurationCost
                vehicleProfileType
                isVehicleAvailable
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
          vehicleId: vehicleId,
        },
        fetchPolicy: 'network-only',
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
              access
              allowedBreaks {
                duration
                timeWindowEarly
                timeWindowLate
                name
              }
              dimension {
                width
                height
                depth
              }
              maximumWeightCapacity
              maximumVolumeCapacity
              timeWindowEarly
              timeWindowLate
              maximumDistance
              maximumDuration
              vehicleGroupId
              fixedCost
              unitDistanceCost
              unitDurationCost
              vehicleProfileType
              isVehicleAvailable
              maxpallet
              zone
              createdAt
              modifiedAt
            }
          }
        `,
        fetchPolicy: 'network-only',
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
          query myVehicleType($vehicleTypeId: String!) {
            myVehicleType(vehicleTypeId: $vehicleTypeId) {
              vehicleTypeId
              name
              access
              allowedBreaks {
                duration
                timeWindowEarly
                timeWindowLate
                name
              }
              dimension {
                width
                height
                depth
              }
              maximumWeightCapacity
              maximumVolumeCapacity
              timeWindowEarly
              timeWindowLate
              maximumDistance
              maximumDuration
              vehicleGroupId
              fixedCost
              unitDistanceCost
              unitDurationCost
              vehicleProfileType
              isVehicleAvailable
              maxpallet
              zone
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

  createVehicle(input: VehicleInput): Observable<VehicleCreationResult> {
    return this.apollo
      .mutate<Response>({
        mutation: gql`
          mutation createVehicle($input: VehicleInput!) {
            createVehicle(input: $input) {
              vehicles {
                companyName
                vehicleId
                licensePlate
                startDepotId {
                  companyName
                  depotId
                  depotName
                  latitude
                  longitude
                  timeWindowEarly
                  timeWindowLate
                  createdAt
                  updatedAt
                  inputdata {
                    companyName
                    depotId
                    keyName
                    displayName
                    columnRequired
                    fileFormatType
                    createdAt
                    modifiedAt
                  }
                }
                endDepotId {
                  companyName
                  depotId
                  depotName
                  latitude
                  longitude
                  timeWindowEarly
                  timeWindowLate
                  createdAt
                  updatedAt
                  inputdata {
                    companyName
                    depotId
                    keyName
                    displayName
                    columnRequired
                    fileFormatType
                    createdAt
                    modifiedAt
                  }
                }
                vehicleType {
                  vehicleTypeId
                  name
                  access
                  allowedBreaks {
                    duration
                    timeWindowEarly
                    timeWindowLate
                    name
                  }
                  dimension {
                    width
                    height
                    depth
                  }
                  maximumWeightCapacity
                  maximumVolumeCapacity
                  timeWindowEarly
                  timeWindowLate
                  maximumDistance
                  maximumDuration
                  vehicleGroupId
                  fixedCost
                  unitDistanceCost
                  unitDurationCost
                  vehicleProfileType
                  isVehicleAvailable
                  createdAt
                  modifiedAt
                }
                isActive
                createdAt
                modifiedAt
              }
              duplicates
              message
            }
          }
        `,
        variables: {
          input,
        },
      })
      .pipe(
        map((result) => result.data!.createVehicle),
        this.errorHandlingService.handleError
      );
  }

  updateVehicle(
    vehicleId: string,
    input: VehicleUpdateInput
  ): Observable<MyVehicles> {
    return this.apollo
      .mutate<Response>({
        mutation: gql`
          mutation updateVehicle(
            $vehicleId: String!
            $input: VehicleUpdateInput!
          ) {
            updateVehicle(vehicleId: $vehicleId, input: $input) {
              companyName
              vehicleId
              licensePlate
              startDepotId {
                companyName
                depotId
                depotName
                latitude
                longitude
                timeWindowEarly
                timeWindowLate
                createdAt
                updatedAt
                inputdata {
                  companyName
                  depotId
                  keyName
                  displayName
                  columnRequired
                  fileFormatType
                  createdAt
                  modifiedAt
                }
              }
              endDepotId {
                companyName
                depotId
                depotName
                latitude
                longitude
                timeWindowEarly
                timeWindowLate
                createdAt
                updatedAt
                inputdata {
                  companyName
                  depotId
                  keyName
                  displayName
                  columnRequired
                  fileFormatType
                  createdAt
                  modifiedAt
                }
              }
              vehicleType {
                vehicleTypeId
                name
                access
                allowedBreaks {
                  duration
                  timeWindowEarly
                  timeWindowLate
                  name
                }
                dimension {
                  width
                  height
                  depth
                }
                maximumWeightCapacity
                maximumVolumeCapacity
                timeWindowEarly
                timeWindowLate
                maximumDistance
                maximumDuration
                vehicleGroupId
                fixedCost
                unitDistanceCost
                unitDurationCost
                vehicleProfileType
                isVehicleAvailable
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
          vehicleId,
          input,
        },
      })
      .pipe(
        map((result) => result.data!.updateVehicle),
        this.errorHandlingService.handleError
      );
  }

  deleteVehicle(vehicleId: string): Observable<boolean> {
    return this.apollo
      .mutate<Response>({
        mutation: gql`
          mutation deleteVehicle($vehicleId: String!) {
            deleteVehicle(vehicleId: $vehicleId)
          }
        `,
        variables: {
          vehicleId,
        },
      })
      .pipe(
        map((result) => result.data!.deleteVehicle),
        this.errorHandlingService.handleError
      );
  }

  softDeleteVehicle(vehicleId: string): Observable<MyVehicles> {
    return this.apollo
      .mutate<Response>({
        mutation: gql`
          mutation softDeleteVehicle($vehicleId: String!) {
            softDeleteVehicle(vehicleId: $vehicleId) {
              companyName
              vehicleId
              licensePlate
              startDepotId {
                depotId
                depotName
                latitude
                longitude
                timeWindowEarly
                timeWindowLate
                createdAt
                updatedAt
              }
              endDepotId {
                depotId
                depotName
                latitude
                longitude
                timeWindowEarly
                timeWindowLate
                createdAt
                updatedAt
              }
              vehicleTypeId
              vehicleType {
                vehicleTypeId
                name
                access
                allowedBreaks {
                  duration
                  timeWindowEarly
                  timeWindowLate
                  name
                }
                dimension {
                  width
                  height
                  depth
                }
                maximumWeightCapacity
                maximumVolumeCapacity
                timeWindowEarly
                timeWindowLate
                maximumDistance
                maximumDuration
                vehicleGroupId
                fixedCost
                unitDistanceCost
                unitDurationCost
                vehicleProfileType
                isVehicleAvailable
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
          vehicleId,
        },
      })
      .pipe(
        map((result) => result.data!.softDeleteVehicle),
        this.errorHandlingService.handleError
      );
  }

  createVehicleType(input: VehicleType): Observable<VehicleType> {
    return this.apollo
      .mutate<Response>({
        mutation: gql`
          mutation createVehicleType($input: VehicleTypeInput!) {
            createVehicleType(input: $input) {
              vehicleTypeId
              name
              access
              allowedBreaks {
                duration
                timeWindowEarly
                timeWindowLate
                name
              }
              dimension {
                width
                height
                depth
              }
              maximumWeightCapacity
              maximumVolumeCapacity
              timeWindowEarly
              timeWindowLate
              maximumDistance
              maximumDuration
              vehicleGroupId
              fixedCost
              unitDistanceCost
              unitDurationCost
              vehicleProfileType
              isVehicleAvailable
              maxpallet
              zone
              createdAt
              modifiedAt
            }
          }
        `,
        variables: {
          input,
        },
      })
      .pipe(
        map((result) => result.data!.createVehicleType),
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
            $input: VehicleTypeUpdateInput!
          ) {
            updateVehicleType(vehicleTypeId: $vehicleTypeId, input: $input) {
              vehicleTypeId
              name
              access
              allowedBreaks {
                duration
                timeWindowEarly
                timeWindowLate
                name
              }
              dimension {
                width
                height
                depth
              }
              maximumWeightCapacity
              maximumVolumeCapacity
              timeWindowEarly
              timeWindowLate
              maximumDistance
              maximumDuration
              vehicleGroupId
              fixedCost
              unitDistanceCost
              unitDurationCost
              vehicleProfileType
              isVehicleAvailable
              maxpallet
              zone
              createdAt
              modifiedAt
            }
          }
        `,
        variables: {
          vehicleTypeId,
          input,
        },
      })
      .pipe(
        map((result) => result.data!.updateVehicleType),
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
        variables: {
          vehicleTypeId,
        },
      })
      .pipe(
        map((result) => result.data!.deleteVehicleType),
        this.errorHandlingService.handleError
      );
  }
}
