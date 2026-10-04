export const parameterTypeDefs = /* GraphQL */ `
  type Constraint {
    earlyDeliveryTime: String
    backToDepotTime: String
    maximumWorkDuration: String
    numberOfVehicleAvailable: Float
    vehicleOrderSizeCapacity: Float
    maximumTravelDistance: Float
    serviceDurationTime: String
    minimumVehicle: Float
  }

  type Parameter {
    companyName: String
    parameters: JSON
  }

  type DynamicParameter {
    companyName: String
    id: String!
    "Localized text: { th_TH, en_US }."
    category: JSON
    depotId: String
    keyName: String!
    displayName: JSON
    valueType: String!
    "A string for time and duration parameters, a number for the others."
    value: JSON
    "The rule a new value is checked against: { type, required, pattern, min, max, message }."
    joiConfig: JSON
    isRequired: Boolean!
    defaultValue: String
    description: JSON
    createdAt: DateTime
    updatedAt: DateTime
  }

  type DynamicParameterUpdateError {
    id: String!
    message: String!
  }

  type UpdateDynamicParameterResult {
    success: Boolean!
    updatedCount: Int!
    errors: [DynamicParameterUpdateError!]!
    results: [DynamicParameter!]!
  }

  type DeleteDynamicParameterResult {
    success: Boolean!
  }

  input ParameterInput {
    earlyDeliveryTime: String
    backToDepotTime: String
    maximumWorkDuration: String
    numberOfVehicleAvailable: Float
    vehicleOrderSizeCapacity: Float
    maximumTravelDistance: Float
    serviceDurationTime: String
    minimumVehicle: Float
  }

  input DynamicParameterUpdateItemInput {
    id: String!
    value: JSON!
  }

  extend type Query {
    myParameter: Constraint!
    parameter(experimentRunID: String!): Parameter!
    "Parameters of one depot plus the company-wide ones; an empty depotId returns all of them."
    dynamicParameters(depotId: String!): [DynamicParameter!]!
    "The parameters a run was validated with."
    dynamicParameter(experimentRunID: String!): [DynamicParameter!]!
  }

  extend type Mutation {
    updateParameter(parameter: ParameterInput!): Constraint!
    updateDynamicParameter(updates: [DynamicParameterUpdateItemInput!]!): UpdateDynamicParameterResult!
    deleteDynamicParameter(id: String!): DeleteDynamicParameterResult!
  }
`;
