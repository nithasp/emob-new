import { ActualLocation, Configuration } from '@features/configurations/models/configuration.model';
import {
  Constraint,
  DynamicParameter,
  DeleteDynamicParameter,
  UpdateDynamicParameter,
  Parameter,
} from '@features/experiment/models/constraint.model';
import {
  DownloadResultFile,
  Experiment,
  ExperimentState,
  UploadPreOrderResponse,
} from '@features/experiment/models/experiment.model';
import {
  MyVehicles,
  VehicleType,
  Depot,
  VehicleEnumOption,
  VehicleCreationResult,
} from '@features/configurations/models/vehicle.model';

export interface Response {
  myDepots: [Depot];
  timestamp: string;
  status_code: number;
  status_message: string;
  errors: Error[];
  myParameter: Constraint;
  parameter: Parameter;
  experiments: [Experiment];
  createExperiment: Experiment;
  experiment: Experiment;
  rerunExperiment: ExperimentState;
  cancelExperiment: ExperimentState;
  replicateExperiment: Experiment;
  updateParameter: Constraint;
  uploadPreOrder: UploadPreOrderResponse;
  validateExperiment: Experiment;
  submitExperiment: Experiment;
  configurations: [Configuration];
  configuration: Configuration;
  replaceTypeOfCategory: Configuration;
  actualLocations: [ActualLocation];
  actualLocation: ActualLocation;
  uploadActualLocation: ActualLocation;
  downloadResultFile: DownloadResultFile;
  dynamicParameters: DynamicParameter[];
  dynamicParameter: DynamicParameter[];
  updateDynamicParameter: UpdateDynamicParameter;
  deleteDynamicParameter: DeleteDynamicParameter;

  myVehicle: MyVehicles;
  myVehicles: [MyVehicles];
  myVehicleType: VehicleType;
  myVehicleTypes: [VehicleType];

  createVehicle: VehicleCreationResult;
  updateVehicle: MyVehicles;
  deleteVehicle: boolean;
  softDeleteVehicle: MyVehicles;
  createVehicleType: VehicleType;
  updateVehicleType: VehicleType;
  deleteVehicleType: boolean;
  getEnumValues: VehicleEnumOption[];
}

export interface Error {
  message: string;
  timestamp: string;
  statusCode: number;
}
