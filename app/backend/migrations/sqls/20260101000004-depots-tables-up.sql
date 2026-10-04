CREATE TABLE depots (
    depot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    depot_name VARCHAR(150) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    time_window_early VARCHAR(5) NOT NULL DEFAULT '08:00',
    time_window_late VARCHAR(5) NOT NULL DEFAULT '18:00',
    sort_order SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, depot_name)
);

CREATE INDEX idx_depots_company_id ON depots(company_id);

CREATE TABLE depot_input_data (
    id BIGSERIAL PRIMARY KEY,
    depot_id UUID NOT NULL REFERENCES depots(depot_id) ON DELETE CASCADE,
    key_name VARCHAR(60) NOT NULL,
    display_name VARCHAR(120) NOT NULL,
    column_required TEXT[] NOT NULL DEFAULT '{}',
    file_format_type VARCHAR(10) NOT NULL DEFAULT 'xlsx' CHECK (file_format_type IN ('xlsx', 'xls', 'csv')),
    required BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (depot_id, key_name)
);
