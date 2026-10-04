import { SampleOperation } from '../types/graphql.types';

const RUN_ID = '00000000-0000-4000-8000-000000000000';

const DEPOT_FIELDS = `depotId
      depotName
      latitude
      longitude
      timeWindowEarly
      timeWindowLate`;

const VEHICLE_TYPE_FIELDS = `vehicleTypeId
    name
    access
    allowedBreaks { name duration timeWindowEarly timeWindowLate }
    dimension { width height depth }
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
    isVehicleAvailable`;

export const SAMPLE_OPERATIONS: SampleOperation[] = [
  {
    name: 'Experiments',
    folder: 'Experiments',
    pinned: true,
    query: `query experiments {
  experiments {
    runId
    name
    status
    run
    timestamp
    timeStart
    timeEnd
    timeDuration
    triggeredByName
    countGeocoding
    countReroute
    depots { depotId depotName }
  }
}`,
  },
  {
    name: 'Experiment detail',
    folder: 'Experiments',
    pinned: true,
    query: `query experiment($Id: RunIdInput!) {
  experiment(input: $Id) {
    runId
    name
    status
    inputdata { keyName filename displayName fileSize fileUrl }
    depots { depotId depotName }
    fileUrls {
      transform { locations warning }
      validate { parameterFormats vehicleTypes preVRPSolution errorWarning }
      plan { vrpSolutionLean geoJson vrpStats }
    }
  }
}`,
    variables: { Id: { runId: RUN_ID } },
  },
  {
    name: 'Create experiment',
    folder: 'Experiments',
    query: `mutation createExperiment {
  createExperiment {
    runId
    name
    status
  }
}`,
  },
  {
    name: 'Validate experiment',
    folder: 'Experiments',
    query: `mutation validateExperiment($validateInput: ExperimentInputValidation!) {
  validateExperiment(input: $validateInput) {
    result
  }
}`,
    variables: {
      validateInput: {
        runId: RUN_ID,
        parameter: {
          earlyDeliveryTime: '08:00',
          backToDepotTime: '18:00',
          maximumWorkDuration: '09:00',
          serviceDurationTime: '00:15',
          numberOfVehicleAvailable: 20,
          vehicleOrderSizeCapacity: 5000,
          maximumTravelDistance: 250,
          minimumVehicle: 1,
        },
        updateLocation: { customers: [] },
        vehicles: [{ vehicleTypeId: RUN_ID, numberOfVehiclesAvailable: 3 }],
      },
    },
  },
  {
    name: 'Submit experiment',
    folder: 'Experiments',
    query: `mutation submitExperiment($input: ExperimentSubmitInput!) {
  submitExperiment(input: $input) {
    runId
    name
    status
    groupId
  }
}`,
    variables: { input: { runId: RUN_ID } },
  },
  {
    name: 'Replicate experiment',
    folder: 'Experiments',
    query: `mutation replicateExperiment($runId: String!) {
  replicateExperiment(runId: $runId) {
    runId
  }
}`,
    variables: { runId: RUN_ID },
  },
  {
    name: 'Retry experiment',
    folder: 'Experiments',
    query: `mutation rerunExperiment($runId: String!) {
  rerunExperiment(runId: $runId) {
    runId
    status
    message
    statusCode
    groupId
  }
}`,
    variables: { runId: RUN_ID },
  },
  {
    name: 'Cancel experiment',
    folder: 'Experiments',
    query: `mutation cancelExperiment($runId: String!) {
  cancelExperiment(runId: $runId) {
    runId
    status
    message
    statusCode
    groupId
  }
}`,
    variables: { runId: RUN_ID },
  },
  {
    name: 'Result file',
    folder: 'Experiments',
    query: `query downloadResultFile($runId: String!) {
  downloadResultFile(experimentRunID: $runId) {
    resultFileBlobPath
    fileUrl { resultFileBlobPathUrl }
  }
}`,
    variables: { runId: RUN_ID },
  },
  {
    name: 'Company and depots',
    folder: 'Master data',
    pinned: true,
    query: `query companyAndDepots {
  myCompany {
    companyName
    depotType
  }
  myDepots {
      ${DEPOT_FIELDS}
    inputdata { keyName displayName columnRequired fileFormatType required }
  }
}`,
  },
  {
    name: 'Configurations',
    folder: 'Master data',
    pinned: true,
    query: `query configurations {
  configurations {
    id
    name
    category
    type
    depotId
    timestamp
    columns
    fileBlobPath
    depot { depotName }
    fileUrl { fileConfigurationUrl }
  }
}`,
  },
  {
    name: 'Vehicle types',
    folder: 'Vehicles',
    pinned: true,
    query: `query myVehicleTypes {
  myVehicleTypes {
    ${VEHICLE_TYPE_FIELDS}
  }
}`,
  },
  {
    name: 'Vehicles',
    folder: 'Vehicles',
    pinned: true,
    query: `query myVehicles($depotId: String, $vehicleTypeId: String) {
  myVehicles(depotId: $depotId, vehicleTypeId: $vehicleTypeId) {
    vehicleId
    licensePlate
    isActive
    startDepotId { depotId depotName }
    endDepotId { depotId depotName }
    vehicleType { vehicleTypeId name maximumWeightCapacity }
  }
}`,
    variables: { depotId: null, vehicleTypeId: null },
  },
  {
    name: 'Create vehicle type',
    folder: 'Vehicles',
    query: `mutation createVehicleType($input: VehicleTypeInput!) {
  createVehicleType(input: $input) {
    ${VEHICLE_TYPE_FIELDS}
  }
}`,
    variables: {
      input: {
        name: 'EV Van 1.2T',
        access: ['REAR', 'LEFT'],
        vehicleProfileType: 'CAR',
        vehicleGroupId: 'EV',
        dimension: { width: 170, height: 180, depth: 300 },
        maximumWeightCapacity: 1200,
        timeWindowEarly: '08:00',
        timeWindowLate: '18:00',
        maximumDistance: 220,
        maximumDuration: '09:00',
        fixedCost: 900,
        unitDistanceCost: 3.2,
        unitDurationCost: 60,
        allowedBreaks: [
          { name: 'Lunch', duration: '01:00', timeWindowEarly: '11:30', timeWindowLate: '13:30' },
        ],
      },
    },
  },
  {
    name: 'Create vehicles',
    folder: 'Vehicles',
    query: `mutation createVehicle($input: VehicleInput!) {
  createVehicle(input: $input) {
    vehicles { vehicleId licensePlate }
    duplicates
    message
  }
}`,
    variables: {
      input: { licensePlates: ['71-0001'], startDepotId: RUN_ID, endDepotId: RUN_ID, vehicleTypeId: RUN_ID },
    },
  },
  {
    name: 'Dynamic parameters',
    folder: 'Parameters',
    pinned: true,
    query: `query dynamicParameters($depotId: String!) {
  dynamicParameters(depotId: $depotId) {
    id
    depotId
    keyName
    category
    displayName
    valueType
    value
    defaultValue
    joiConfig
  }
}`,
    variables: { depotId: '' },
  },
  {
    name: 'Update dynamic parameters',
    folder: 'Parameters',
    query: `mutation updateDynamicParameter($updates: [DynamicParameterUpdateItemInput!]!) {
  updateDynamicParameter(updates: $updates) {
    success
    updatedCount
    errors { id message }
    results { id keyName value }
  }
}`,
    variables: { updates: [{ id: RUN_ID, value: '08:30' }] },
  },
  {
    name: 'Parameters of a run',
    folder: 'Parameters',
    query: `query dynamicParameter($experimentRunID: String!) {
  dynamicParameter(experimentRunID: $experimentRunID) {
    keyName
    displayName
    valueType
    value
  }
}`,
    variables: { experimentRunID: RUN_ID },
  },
];
