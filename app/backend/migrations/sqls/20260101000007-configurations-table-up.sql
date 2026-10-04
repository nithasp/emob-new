CREATE TABLE configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    depot_id UUID NOT NULL REFERENCES depots(depot_id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(60) NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'xlsx',
    file_blob_path TEXT NOT NULL DEFAULT '',
    columns TEXT[] NOT NULL DEFAULT '{}',
    replace BOOLEAN NOT NULL DEFAULT TRUE,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_configurations_company_depot ON configurations(company_id, depot_id);
