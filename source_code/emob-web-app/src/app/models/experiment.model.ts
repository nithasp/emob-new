export interface Experiment {
  GroupId: string;
  Name?: string;
  Run: 'Original' | 'Rerun';
  RunId: string;
  Status: 'Succeeded' | 'In progress' | 'Queued' | 'Failed' | 'Canceled' | "Initializing";
  TimeDulatin: string;
  TimeEnd: string;
  TimeStart: string;
  Timestamp: string;
  TriggeredBy: string;
}

