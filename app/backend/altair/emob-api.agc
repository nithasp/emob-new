{
  "version": 1,
  "type": "collection",
  "title": "E-Mobility API",
  "queries": [],
  "collections": [
    {
      "title": "Experiments",
      "queries": [
        {
          "version": 1,
          "type": "window",
          "windowName": "Experiments",
          "apiUrl": "http://localhost:4000/api/v1/graphql",
          "query": "query experiments {\n  experiments {\n    runId\n    name\n    status\n    run\n    timestamp\n    timeStart\n    timeEnd\n    timeDuration\n    triggeredByName\n    countGeocoding\n    countReroute\n    depots { depotId depotName }\n  }\n}",
          "variables": "{}",
          "subscriptionUrl": "",
          "headers": [
            {
              "key": "Authorization",
              "value": "Bearer {{accessToken}}",
              "enabled": true
            }
          ],
          "preRequestScript": "",
          "preRequestScriptEnabled": false,
          "postRequestScript": "",
          "postRequestScriptEnabled": false
        },
        {
          "version": 1,
          "type": "window",
          "windowName": "Experiment detail",
          "apiUrl": "http://localhost:4000/api/v1/graphql",
          "query": "query experiment($Id: RunIdInput!) {\n  experiment(input: $Id) {\n    runId\n    name\n    status\n    inputdata { keyName filename displayName fileSize fileUrl }\n    depots { depotId depotName }\n    fileUrls {\n      transform { locations warning }\n      validate { parameterFormats vehicleTypes preVRPSolution errorWarning }\n      plan { vrpSolutionLean geoJson vrpStats }\n    }\n  }\n}",
          "variables": "{\n  \"Id\": {\n    \"runId\": \"00000000-0000-4000-8000-000000000000\"\n  }\n}",
          "subscriptionUrl": "",
          "headers": [
            {
              "key": "Authorization",
              "value": "Bearer {{accessToken}}",
              "enabled": true
            }
          ],
          "preRequestScript": "",
          "preRequestScriptEnabled": false,
          "postRequestScript": "",
          "postRequestScriptEnabled": false
        },
        {
          "version": 1,
          "type": "window",
          "windowName": "Create experiment",
          "apiUrl": "http://localhost:4000/api/v1/graphql",
          "query": "mutation createExperiment {\n  createExperiment {\n    runId\n    name\n    status\n  }\n}",
          "variables": "{}",
          "subscriptionUrl": "",
          "headers": [
            {
              "key": "Authorization",
              "value": "Bearer {{accessToken}}",
              "enabled": true
            }
          ],
          "preRequestScript": "",
          "preRequestScriptEnabled": false,
          "postRequestScript": "",
          "postRequestScriptEnabled": false
        },
        {
          "version": 1,
          "type": "window",
          "windowName": "Validate experiment",
          "apiUrl": "http://localhost:4000/api/v1/graphql",
          "query": "mutation validateExperiment($validateInput: ExperimentInputValidation!) {\n  validateExperiment(input: $validateInput) {\n    result\n  }\n}",
          "variables": "{\n  \"validateInput\": {\n    \"runId\": \"00000000-0000-4000-8000-000000000000\",\n    \"parameter\": {\n      \"earlyDeliveryTime\": \"08:00\",\n      \"backToDepotTime\": \"18:00\",\n      \"maximumWorkDuration\": \"09:00\",\n      \"serviceDurationTime\": \"00:15\",\n      \"numberOfVehicleAvailable\": 20,\n      \"vehicleOrderSizeCapacity\": 5000,\n      \"maximumTravelDistance\": 250,\n      \"minimumVehicle\": 1\n    },\n    \"updateLocation\": {\n      \"customers\": []\n    },\n    \"vehicles\": [\n      {\n        \"vehicleTypeId\": \"00000000-0000-4000-8000-000000000000\",\n        \"numberOfVehiclesAvailable\": 3\n      }\n    ]\n  }\n}",
          "subscriptionUrl": "",
          "headers": [
            {
              "key": "Authorization",
              "value": "Bearer {{accessToken}}",
              "enabled": true
            }
          ],
          "preRequestScript": "",
          "preRequestScriptEnabled": false,
          "postRequestScript": "",
          "postRequestScriptEnabled": false
        },
        {
          "version": 1,
          "type": "window",
          "windowName": "Submit experiment",
          "apiUrl": "http://localhost:4000/api/v1/graphql",
          "query": "mutation submitExperiment($input: ExperimentSubmitInput!) {\n  submitExperiment(input: $input) {\n    runId\n    name\n    status\n    groupId\n  }\n}",
          "variables": "{\n  \"input\": {\n    \"runId\": \"00000000-0000-4000-8000-000000000000\"\n  }\n}",
          "subscriptionUrl": "",
          "headers": [
            {
              "key": "Authorization",
              "value": "Bearer {{accessToken}}",
              "enabled": true
            }
          ],
          "preRequestScript": "",
          "preRequestScriptEnabled": false,
          "postRequestScript": "",
          "postRequestScriptEnabled": false
        },
        {
          "version": 1,
          "type": "window",
          "windowName": "Replicate experiment",
          "apiUrl": "http://localhost:4000/api/v1/graphql",
          "query": "mutation replicateExperiment($runId: String!) {\n  replicateExperiment(runId: $runId) {\n    runId\n  }\n}",
          "variables": "{\n  \"runId\": \"00000000-0000-4000-8000-000000000000\"\n}",
          "subscriptionUrl": "",
          "headers": [
            {
              "key": "Authorization",
              "value": "Bearer {{accessToken}}",
              "enabled": true
            }
          ],
          "preRequestScript": "",
          "preRequestScriptEnabled": false,
          "postRequestScript": "",
          "postRequestScriptEnabled": false
        },
        {
          "version": 1,
          "type": "window",
          "windowName": "Retry experiment",
          "apiUrl": "http://localhost:4000/api/v1/graphql",
          "query": "mutation rerunExperiment($runId: String!) {\n  rerunExperiment(runId: $runId) {\n    runId\n    status\n    message\n    statusCode\n    groupId\n  }\n}",
          "variables": "{\n  \"runId\": \"00000000-0000-4000-8000-000000000000\"\n}",
          "subscriptionUrl": "",
          "headers": [
            {
              "key": "Authorization",
              "value": "Bearer {{accessToken}}",
              "enabled": true
            }
          ],
          "preRequestScript": "",
          "preRequestScriptEnabled": false,
          "postRequestScript": "",
          "postRequestScriptEnabled": false
        },
        {
          "version": 1,
          "type": "window",
          "windowName": "Cancel experiment",
          "apiUrl": "http://localhost:4000/api/v1/graphql",
          "query": "mutation cancelExperiment($runId: String!) {\n  cancelExperiment(runId: $runId) {\n    runId\n    status\n    message\n    statusCode\n    groupId\n  }\n}",
          "variables": "{\n  \"runId\": \"00000000-0000-4000-8000-000000000000\"\n}",
          "subscriptionUrl": "",
          "headers": [
            {
              "key": "Authorization",
              "value": "Bearer {{accessToken}}",
              "enabled": true
            }
          ],
          "preRequestScript": "",
          "preRequestScriptEnabled": false,
          "postRequestScript": "",
          "postRequestScriptEnabled": false
        },
        {
          "version": 1,
          "type": "window",
          "windowName": "Result file",
          "apiUrl": "http://localhost:4000/api/v1/graphql",
          "query": "query downloadResultFile($runId: String!) {\n  downloadResultFile(experimentRunID: $runId) {\n    resultFileBlobPath\n    fileUrl { resultFileBlobPathUrl }\n  }\n}",
          "variables": "{\n  \"runId\": \"00000000-0000-4000-8000-000000000000\"\n}",
          "subscriptionUrl": "",
          "headers": [
            {
              "key": "Authorization",
              "value": "Bearer {{accessToken}}",
              "enabled": true
            }
          ],
          "preRequestScript": "",
          "preRequestScriptEnabled": false,
          "postRequestScript": "",
          "postRequestScriptEnabled": false
        }
      ]
    },
    {
      "title": "Master data",
      "queries": [
        {
          "version": 1,
          "type": "window",
          "windowName": "Company and depots",
          "apiUrl": "http://localhost:4000/api/v1/graphql",
          "query": "query companyAndDepots {\n  myCompany {\n    companyName\n    depotType\n  }\n  myDepots {\n      depotId\n      depotName\n      latitude\n      longitude\n      timeWindowEarly\n      timeWindowLate\n    inputdata { keyName displayName columnRequired fileFormatType required }\n  }\n}",
          "variables": "{}",
          "subscriptionUrl": "",
          "headers": [
            {
              "key": "Authorization",
              "value": "Bearer {{accessToken}}",
              "enabled": true
            }
          ],
          "preRequestScript": "",
          "preRequestScriptEnabled": false,
          "postRequestScript": "",
          "postRequestScriptEnabled": false
        },
        {
          "version": 1,
          "type": "window",
          "windowName": "Configurations",
          "apiUrl": "http://localhost:4000/api/v1/graphql",
          "query": "query configurations {\n  configurations {\n    id\n    name\n    category\n    type\n    depotId\n    timestamp\n    columns\n    fileBlobPath\n    depot { depotName }\n    fileUrl { fileConfigurationUrl }\n  }\n}",
          "variables": "{}",
          "subscriptionUrl": "",
          "headers": [
            {
              "key": "Authorization",
              "value": "Bearer {{accessToken}}",
              "enabled": true
            }
          ],
          "preRequestScript": "",
          "preRequestScriptEnabled": false,
          "postRequestScript": "",
          "postRequestScriptEnabled": false
        }
      ]
    },
    {
      "title": "Vehicles",
      "queries": [
        {
          "version": 1,
          "type": "window",
          "windowName": "Vehicle types",
          "apiUrl": "http://localhost:4000/api/v1/graphql",
          "query": "query myVehicleTypes {\n  myVehicleTypes {\n    vehicleTypeId\n    name\n    access\n    allowedBreaks { name duration timeWindowEarly timeWindowLate }\n    dimension { width height depth }\n    maximumWeightCapacity\n    maximumVolumeCapacity\n    timeWindowEarly\n    timeWindowLate\n    maximumDistance\n    maximumDuration\n    vehicleGroupId\n    fixedCost\n    unitDistanceCost\n    unitDurationCost\n    vehicleProfileType\n    isVehicleAvailable\n  }\n}",
          "variables": "{}",
          "subscriptionUrl": "",
          "headers": [
            {
              "key": "Authorization",
              "value": "Bearer {{accessToken}}",
              "enabled": true
            }
          ],
          "preRequestScript": "",
          "preRequestScriptEnabled": false,
          "postRequestScript": "",
          "postRequestScriptEnabled": false
        },
        {
          "version": 1,
          "type": "window",
          "windowName": "Vehicles",
          "apiUrl": "http://localhost:4000/api/v1/graphql",
          "query": "query myVehicles($depotId: String, $vehicleTypeId: String) {\n  myVehicles(depotId: $depotId, vehicleTypeId: $vehicleTypeId) {\n    vehicleId\n    licensePlate\n    isActive\n    startDepotId { depotId depotName }\n    endDepotId { depotId depotName }\n    vehicleType { vehicleTypeId name maximumWeightCapacity }\n  }\n}",
          "variables": "{\n  \"depotId\": null,\n  \"vehicleTypeId\": null\n}",
          "subscriptionUrl": "",
          "headers": [
            {
              "key": "Authorization",
              "value": "Bearer {{accessToken}}",
              "enabled": true
            }
          ],
          "preRequestScript": "",
          "preRequestScriptEnabled": false,
          "postRequestScript": "",
          "postRequestScriptEnabled": false
        },
        {
          "version": 1,
          "type": "window",
          "windowName": "Create vehicle type",
          "apiUrl": "http://localhost:4000/api/v1/graphql",
          "query": "mutation createVehicleType($input: VehicleTypeInput!) {\n  createVehicleType(input: $input) {\n    vehicleTypeId\n    name\n    access\n    allowedBreaks { name duration timeWindowEarly timeWindowLate }\n    dimension { width height depth }\n    maximumWeightCapacity\n    maximumVolumeCapacity\n    timeWindowEarly\n    timeWindowLate\n    maximumDistance\n    maximumDuration\n    vehicleGroupId\n    fixedCost\n    unitDistanceCost\n    unitDurationCost\n    vehicleProfileType\n    isVehicleAvailable\n  }\n}",
          "variables": "{\n  \"input\": {\n    \"name\": \"EV Van 1.2T\",\n    \"access\": [\n      \"REAR\",\n      \"LEFT\"\n    ],\n    \"vehicleProfileType\": \"CAR\",\n    \"vehicleGroupId\": \"EV\",\n    \"dimension\": {\n      \"width\": 170,\n      \"height\": 180,\n      \"depth\": 300\n    },\n    \"maximumWeightCapacity\": 1200,\n    \"timeWindowEarly\": \"08:00\",\n    \"timeWindowLate\": \"18:00\",\n    \"maximumDistance\": 220,\n    \"maximumDuration\": \"09:00\",\n    \"fixedCost\": 900,\n    \"unitDistanceCost\": 3.2,\n    \"unitDurationCost\": 60,\n    \"allowedBreaks\": [\n      {\n        \"name\": \"Lunch\",\n        \"duration\": \"01:00\",\n        \"timeWindowEarly\": \"11:30\",\n        \"timeWindowLate\": \"13:30\"\n      }\n    ]\n  }\n}",
          "subscriptionUrl": "",
          "headers": [
            {
              "key": "Authorization",
              "value": "Bearer {{accessToken}}",
              "enabled": true
            }
          ],
          "preRequestScript": "",
          "preRequestScriptEnabled": false,
          "postRequestScript": "",
          "postRequestScriptEnabled": false
        },
        {
          "version": 1,
          "type": "window",
          "windowName": "Create vehicles",
          "apiUrl": "http://localhost:4000/api/v1/graphql",
          "query": "mutation createVehicle($input: VehicleInput!) {\n  createVehicle(input: $input) {\n    vehicles { vehicleId licensePlate }\n    duplicates\n    message\n  }\n}",
          "variables": "{\n  \"input\": {\n    \"licensePlates\": [\n      \"71-0001\"\n    ],\n    \"startDepotId\": \"00000000-0000-4000-8000-000000000000\",\n    \"endDepotId\": \"00000000-0000-4000-8000-000000000000\",\n    \"vehicleTypeId\": \"00000000-0000-4000-8000-000000000000\"\n  }\n}",
          "subscriptionUrl": "",
          "headers": [
            {
              "key": "Authorization",
              "value": "Bearer {{accessToken}}",
              "enabled": true
            }
          ],
          "preRequestScript": "",
          "preRequestScriptEnabled": false,
          "postRequestScript": "",
          "postRequestScriptEnabled": false
        }
      ]
    },
    {
      "title": "Parameters",
      "queries": [
        {
          "version": 1,
          "type": "window",
          "windowName": "Dynamic parameters",
          "apiUrl": "http://localhost:4000/api/v1/graphql",
          "query": "query dynamicParameters($depotId: String!) {\n  dynamicParameters(depotId: $depotId) {\n    id\n    depotId\n    keyName\n    category\n    displayName\n    valueType\n    value\n    defaultValue\n    joiConfig\n  }\n}",
          "variables": "{\n  \"depotId\": \"\"\n}",
          "subscriptionUrl": "",
          "headers": [
            {
              "key": "Authorization",
              "value": "Bearer {{accessToken}}",
              "enabled": true
            }
          ],
          "preRequestScript": "",
          "preRequestScriptEnabled": false,
          "postRequestScript": "",
          "postRequestScriptEnabled": false
        },
        {
          "version": 1,
          "type": "window",
          "windowName": "Update dynamic parameters",
          "apiUrl": "http://localhost:4000/api/v1/graphql",
          "query": "mutation updateDynamicParameter($updates: [DynamicParameterUpdateItemInput!]!) {\n  updateDynamicParameter(updates: $updates) {\n    success\n    updatedCount\n    errors { id message }\n    results { id keyName value }\n  }\n}",
          "variables": "{\n  \"updates\": [\n    {\n      \"id\": \"00000000-0000-4000-8000-000000000000\",\n      \"value\": \"08:30\"\n    }\n  ]\n}",
          "subscriptionUrl": "",
          "headers": [
            {
              "key": "Authorization",
              "value": "Bearer {{accessToken}}",
              "enabled": true
            }
          ],
          "preRequestScript": "",
          "preRequestScriptEnabled": false,
          "postRequestScript": "",
          "postRequestScriptEnabled": false
        },
        {
          "version": 1,
          "type": "window",
          "windowName": "Parameters of a run",
          "apiUrl": "http://localhost:4000/api/v1/graphql",
          "query": "query dynamicParameter($experimentRunID: String!) {\n  dynamicParameter(experimentRunID: $experimentRunID) {\n    keyName\n    displayName\n    valueType\n    value\n  }\n}",
          "variables": "{\n  \"experimentRunID\": \"00000000-0000-4000-8000-000000000000\"\n}",
          "subscriptionUrl": "",
          "headers": [
            {
              "key": "Authorization",
              "value": "Bearer {{accessToken}}",
              "enabled": true
            }
          ],
          "preRequestScript": "",
          "preRequestScriptEnabled": false,
          "postRequestScript": "",
          "postRequestScriptEnabled": false
        }
      ]
    }
  ]
}
