CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(120) NOT NULL,
    depot_type VARCHAR(20) NOT NULL DEFAULT 'Single' CHECK (depot_type IN ('Single', 'Multi')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX companies_company_name_lower_key ON companies (LOWER(company_name));

-- Every row a user can reach is scoped by company_id, so the tenant is decided here and never by
-- a value the client sends.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'BRS' CHECK (role IN ('BRS', 'Admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX users_username_lower_key ON users (LOWER(username));
CREATE INDEX idx_users_company_id ON users(company_id);
