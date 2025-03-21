import { ActualLocation, Configuration } from './configuration.model';
import { Constraint  } from './constraint.model';
import { Experiment, ValidateExperiment } from './experiment.model';
import { UploadPreOrder } from './pre-order.model';

export interface Response {
    timestamp: string;
    status_code: number;
    status_message: string;
    error: any;
    myParameter : Constraint,
    parameter: Constraint,
    experiments : [Experiment]
    createExperiment: Experiment
    experiment : Experiment
    updateParameter : Constraint
    uploadPreOrder : UploadPreOrder
    validateExperiment : ValidateExperiment
    submitExperiment: Experiment,
    configurations:[Configuration],
    configuration : Configuration,
    replaceTypeOfCategory: Configuration,
    actualLocations: [ActualLocation],
    actualLocation: ActualLocation,
    uploadActualLocation: ActualLocation
  }