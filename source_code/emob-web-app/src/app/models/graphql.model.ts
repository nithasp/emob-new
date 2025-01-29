import { Constraint  } from './constraint.model';
import { Experiment } from './experiment.model';

export interface Response {
    timestamp: string;
    status_code: number;
    status_message: string;
    error: any;
    myParameter : Constraint
    experiments : [Experiment]
    createExperiment: Experiment
    experiment : Experiment
    updateParameter : Constraint
  }