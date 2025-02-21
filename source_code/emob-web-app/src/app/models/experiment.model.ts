export interface Experiment {
  groupId: string;
  name: string;
  run: 'Original' | 'Rerun';
  runId: string;
  status: 'Succeeded' | 'In progress' | 'Queued' | 'Failed' | 'Canceled' | "Initializing";
  timeDuration: string;
  timeEnd: string;
  timeStart: string;
  timestamp: string;
  triggeredBy: string;
}

