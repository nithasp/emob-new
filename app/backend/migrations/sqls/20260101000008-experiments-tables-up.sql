-- files holds the storage keys of everything a run produced:
--   {"transform": {...}, "validate": {...}, "plan": {...}, "result": "..."}
-- parameters is the snapshot of the dynamic parameters the run was validated with.
CREATE TABLE experiments (
    run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    group_id UUID NOT NULL DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    run VARCHAR(10) NOT NULL DEFAULT 'Original' CHECK (run IN ('Original', 'Rerun')),
    status VARCHAR(20) NOT NULL DEFAULT 'Initializing'
      CHECK (status IN ('Initializing', 'UploadCompleted', 'Queued', 'InProgress', 'Succeeded', 'Failed', 'Cancelled')),
    triggered_by UUID NOT NULL REFERENCES users(id),
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    time_start TIMESTAMPTZ,
    time_end TIMESTAMPTZ,
    time_duration INTEGER,
    count_geocoding INTEGER NOT NULL DEFAULT 0,
    count_reroute INTEGER NOT NULL DEFAULT 0,
    inputdata JSONB NOT NULL DEFAULT '[]',
    files JSONB NOT NULL DEFAULT '{}',
    parameters JSONB NOT NULL DEFAULT '[]',
    error_message TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_experiments_company_timestamp ON experiments(company_id, "timestamp" DESC);
CREATE INDEX idx_experiments_pending ON experiments(status) WHERE status IN ('Queued', 'InProgress');

CREATE TABLE experiment_depots (
    run_id UUID NOT NULL REFERENCES experiments(run_id) ON DELETE CASCADE,
    depot_id UUID NOT NULL REFERENCES depots(depot_id),
    position SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (run_id, depot_id)
);
