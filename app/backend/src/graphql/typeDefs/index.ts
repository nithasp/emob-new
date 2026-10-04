import { configurationTypeDefs } from './configuration';
import { experimentTypeDefs } from './experiment';
import { parameterTypeDefs } from './parameter';
import { vehicleTypeDefs } from './vehicle';

// Operation, field and input type names are the contract the web app was built against: its
// queries name these input types in their variable definitions, so they cannot be renamed.
const baseTypeDefs = /* GraphQL */ `
  "Any JSON value: objects with keys that vary per company, localized texts, solver output."
  scalar JSON

  "An instant in ISO 8601 form."
  scalar DateTime

  "A file sent with a GraphQL multipart request."
  scalar Upload

  type Company {
    companyName: String!
    depotType: String!
  }

  type DepotInputData {
    companyName: String
    depotId: String!
    keyName: String!
    displayName: String!
    columnRequired: [String!]!
    fileFormatType: String!
    required: Boolean!
    createdAt: DateTime
    modifiedAt: DateTime
  }

  type Depot {
    companyName: String
    depotId: String!
    depotName: String!
    latitude: Float!
    longitude: Float!
    timeWindowEarly: String
    timeWindowLate: String
    createdAt: DateTime
    updatedAt: DateTime
    inputdata: [DepotInputData!]!
  }

  type Query {
    myCompany: Company!
    myDepots: [Depot!]!
  }

  type Mutation
`;

export const typeDefs = [
  baseTypeDefs,
  experimentTypeDefs,
  parameterTypeDefs,
  configurationTypeDefs,
  vehicleTypeDefs,
];
