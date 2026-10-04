export const experimentTypeDefs = /* GraphQL */ `
  type ExperimentInputData {
    keyName: String!
    filename: String!
    blobPath: String!
    displayName: String!
    fileFormatType: String!
    fileSize: Float!
    fileUrl: String
  }

  type TransformFileUrls {
    locations: String
    warning: String
  }

  type ValidateFileUrls {
    parameterFormats: String
    vehicleTypes: String
    preVRPSolution: String
    errorWarning: String
  }

  type PlanFileUrls {
    vrpSolutionLean: String
    geoJson: String
    vrpStats: String
  }

  type ExperimentFileUrls {
    transform: TransformFileUrls!
    validate: ValidateFileUrls!
    plan: PlanFileUrls!
  }

  type Experiment {
    companyName: String
    runId: String!
    name: String!
    timestamp: DateTime!
    configurations: JSON
    inputdata: [ExperimentInputData!]!
    depots: [Depot!]!
    timeStart: DateTime
    timeEnd: DateTime
    "Milliseconds between the start and the end of the run."
    timeDuration: Float
    triggeredBy: String!
    triggeredByName: String
    status: String!
    run: String!
    groupId: String!
    countGeocoding: Int!
    countReroute: Int!
    fileUrls: ExperimentFileUrls!
    "Set by validateExperiment only: the validation outcome."
    result: JSON
  }

  type ExperimentState {
    runId: String!
    message: String!
    statusCode: String!
    status: String!
    groupId: String!
  }

  type UploadPreOrderResult {
    name: String!
    timestamp: DateTime
    groupId: String
    "The transform outcome: isSuccesses, warning, error."
    result: JSON
    status: String
  }

  type ResultFileUrl {
    resultFileBlobPathUrl: String!
  }

  type DownloadResultFile {
    resultFileBlobPath: String!
    fileUrl: ResultFileUrl!
  }

  input RunIdInput {
    runId: String!
  }

  input ExperimentSubmitInput {
    runId: String!
  }

  input PreOrderFileInput {
    file: Upload!
    keyName: String
  }

  input PreOrderInput {
    runId: String!
    depotId: [String!]
    preOrderFiles: [PreOrderFileInput!]!
  }

  input CustomerLocationInput {
    nodeId: String
    name: String
    index: Int
    latitude: Float!
    longitude: Float!
  }

  input UpdateLocationInput {
    customers: [CustomerLocationInput!]
  }

  input VehicleValidationInput {
    vehicleTypeId: String!
    vehicleId: [String!]
    numberOfVehiclesAvailable: Int
  }

  input ExperimentInputValidation {
    runId: String!
    "Planning constraints keyed by parameter name, e.g. { earlyDeliveryTime: \\"08:00\\" }."
    parameter: JSON!
    updateLocation: UpdateLocationInput
    vehicles: [VehicleValidationInput!]
  }

  extend type Query {
    experiments: [Experiment!]!
    experiment(input: RunIdInput!): Experiment!
    downloadResultFile(experimentRunID: String!): DownloadResultFile!
  }

  extend type Mutation {
    createExperiment: Experiment!
    uploadPreOrder(input: PreOrderInput!): UploadPreOrderResult!
    validateExperiment(input: ExperimentInputValidation!): Experiment!
    submitExperiment(input: ExperimentSubmitInput!): Experiment!
    rerunExperiment(runId: String!): ExperimentState!
    cancelExperiment(runId: String!): ExperimentState!
    replicateExperiment(runId: String!): Experiment!
  }
`;
