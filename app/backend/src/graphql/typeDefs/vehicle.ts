export const vehicleTypeDefs = /* GraphQL */ `
  type VehicleBreak {
    name: String
    duration: String
    timeWindowEarly: String
    timeWindowLate: String
  }

  type Dimension {
    width: Float
    height: Float
    depth: Float
  }

  type VehicleType {
    vehicleTypeId: String!
    name: String!
    access: [String!]
    allowedBreaks: [VehicleBreak!]
    dimension: Dimension
    maximumWeightCapacity: Float
    maximumVolumeCapacity: Float
    timeWindowEarly: String
    timeWindowLate: String
    maximumDistance: Float
    maximumDuration: String
    vehicleGroupId: String
    fixedCost: Float
    unitDistanceCost: Float
    unitDurationCost: Float
    vehicleProfileType: String!
    isVehicleAvailable: Boolean!
    maxpallet: Float
    zone: String
    maxTrip: Int
    loadingDuration: String
    createdAt: DateTime
    modifiedAt: DateTime
  }

  "A vehicle of the central pool. startDepotId and endDepotId resolve to the depot itself."
  type Vehicle {
    companyName: String
    vehicleId: String!
    licensePlate: String!
    startDepotId: Depot
    endDepotId: Depot
    vehicleTypeId: String!
    vehicleType: VehicleType
    isActive: Boolean!
    createdAt: DateTime
    modifiedAt: DateTime
  }

  type VehicleCreationResult {
    vehicles: [Vehicle!]!
    "License plates that were skipped because they already exist."
    duplicates: [String!]!
    message: String!
  }

  input VehicleInput {
    licensePlates: [String!]!
    startDepotId: String!
    endDepotId: String!
    vehicleTypeId: String!
  }

  input VehicleUpdateInput {
    licensePlate: String
    startDepotId: String
    endDepotId: String
    vehicleTypeId: String
    isActive: Boolean
  }

  input VehicleBreakInput {
    name: String
    duration: String
    timeWindowEarly: String
    timeWindowLate: String
  }

  input DimensionInput {
    width: Float
    height: Float
    depth: Float
  }

  input VehicleTypeInput {
    name: String!
    access: [String!]
    allowedBreaks: [VehicleBreakInput!]
    dimension: DimensionInput
    maximumWeightCapacity: Float
    maximumVolumeCapacity: Float
    timeWindowEarly: String
    timeWindowLate: String
    maximumDistance: Float
    maximumDuration: String
    vehicleGroupId: String
    fixedCost: Float
    unitDistanceCost: Float
    unitDurationCost: Float
    vehicleProfileType: String
    isVehicleAvailable: Boolean
    maxpallet: Float
    zone: String
    maxTrip: Int
    loadingDuration: String
  }

  "The whole form is written on every update: a field left out is cleared."
  input VehicleTypeUpdateInput {
    name: String!
    access: [String!]
    allowedBreaks: [VehicleBreakInput!]
    dimension: DimensionInput
    maximumWeightCapacity: Float
    maximumVolumeCapacity: Float
    timeWindowEarly: String
    timeWindowLate: String
    maximumDistance: Float
    maximumDuration: String
    vehicleGroupId: String
    fixedCost: Float
    unitDistanceCost: Float
    unitDurationCost: Float
    vehicleProfileType: String
    isVehicleAvailable: Boolean
    maxpallet: Float
    zone: String
    maxTrip: Int
    loadingDuration: String
  }

  extend type Query {
    "Options of an enum as [{ key, value }]: VehicleProfileTypeEnum or AccessTypeEnum."
    getEnumValues(enumName: String!): JSON!
    myVehicles(depotId: String, vehicleTypeId: String): [Vehicle!]!
    myVehicle(vehicleId: String!): Vehicle!
    myVehicleTypes: [VehicleType!]!
    myVehicleType(vehicleTypeId: String!): VehicleType!
  }

  extend type Mutation {
    createVehicle(input: VehicleInput!): VehicleCreationResult!
    updateVehicle(vehicleId: String!, input: VehicleUpdateInput!): Vehicle!
    deleteVehicle(vehicleId: String!): Boolean!
    "Takes a vehicle out of service without removing it."
    softDeleteVehicle(vehicleId: String!): Vehicle!
    createVehicleType(input: VehicleTypeInput!): VehicleType!
    updateVehicleType(vehicleTypeId: String!, input: VehicleTypeUpdateInput!): VehicleType!
    deleteVehicleType(vehicleTypeId: String!): Boolean!
  }
`;
