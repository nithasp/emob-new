export const configurationTypeDefs = /* GraphQL */ `
  type ConfigurationFileUrl {
    fileConfigurationUrl: String
  }

  type Configuration {
    companyName: String
    id: String!
    timestamp: DateTime!
    name: String!
    category: String!
    type: String!
    depotId: String!
    fileBlobPath: String!
    columns: [String!]!
    replace: Boolean!
    depot: Depot
    fileUrl: ConfigurationFileUrl!
  }

  type ActualLocationFileUrl {
    fileActualLocationUrl: String
  }

  type ActualLocationFile {
    fileName: String!
    fileBlobPath: String!
    timestamp: DateTime!
    fileUrl: ActualLocationFileUrl!
  }

  type ActualLocationMonth {
    month: String!
    children: [ActualLocationFile!]!
  }

  type ActualLocation {
    year: String!
    children: [ActualLocationMonth!]!
  }

  input replaceCategoryInput {
    file: Upload!
    id: String!
  }

  extend type Query {
    configurations: [Configuration!]!
    configuration(id: String!): Configuration!
    actualLocation(blobPath: String!): ActualLocation
  }

  extend type Mutation {
    uploadActualLocation(file: Upload!): ActualLocation
    replaceTypeOfCategory(input: replaceCategoryInput!): Configuration!
  }
`;
