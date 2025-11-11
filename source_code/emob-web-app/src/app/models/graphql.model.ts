import { ActualLocation, Configuration } from './configuration.model';
import {
  Constraint,
  DynamicParameter,
  DeleteDynamicParameter,
  UpdateDynamicParameter,
  Parameter,
} from './constraint.model';
import {
  DownloadResultFile,
  Experiment,
  ExperimentState,
  MyDepot,
} from './experiment.model';

export interface Response {
  myDepots: MyDepot[];
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
  uploadPreOrder: Experiment;
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
}

export interface Error {
  message: string;
  timestamp: string;
  statusCode: number;
}
