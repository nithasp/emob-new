CREATE TABLE dynamic_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    depot_id UUID REFERENCES depots(depot_id) ON DELETE CASCADE,
    category JSONB NOT NULL,
    key_name VARCHAR(80) NOT NULL,
    display_name JSONB NOT NULL,
    value_type VARCHAR(30) NOT NULL,
    value TEXT,
    joi_config JSONB NOT NULL DEFAULT '{}',
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    default_value TEXT,
    description JSONB NOT NULL DEFAULT '{}',
    sort_order SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX dynamic_parameters_scope_key_name_key
  ON dynamic_parameters (company_id, COALESCE(depot_id, '00000000-0000-0000-0000-000000000000'::uuid), key_name);
