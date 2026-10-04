CREATE TABLE vehicle_types (
    vehicle_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    access TEXT[] NOT NULL DEFAULT '{}',
    allowed_breaks JSONB NOT NULL DEFAULT '[]',
    dimension JSONB,
    maximum_weight_capacity DOUBLE PRECISION CHECK (maximum_weight_capacity >= 0),
    maximum_volume_capacity DOUBLE PRECISION CHECK (maximum_volume_capacity >= 0),
    time_window_early VARCHAR(5),
    time_window_late VARCHAR(5),
    maximum_distance DOUBLE PRECISION CHECK (maximum_distance >= 0),
    maximum_duration VARCHAR(5),
    vehicle_group_id VARCHAR(60),
    fixed_cost DOUBLE PRECISION CHECK (fixed_cost >= 0),
    unit_distance_cost DOUBLE PRECISION CHECK (unit_distance_cost >= 0),
    unit_duration_cost DOUBLE PRECISION CHECK (unit_duration_cost >= 0),
    vehicle_profile_type VARCHAR(20) NOT NULL DEFAULT 'TRUCK' CHECK (vehicle_profile_type IN ('CAR', 'TRUCK')),
    is_vehicle_available BOOLEAN NOT NULL DEFAULT TRUE,
    maxpallet DOUBLE PRECISION CHECK (maxpallet >= 0),
    zone VARCHAR(120),
    max_trip SMALLINT CHECK (max_trip >= 1),
    loading_duration VARCHAR(5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX vehicle_types_company_name_key ON vehicle_types (company_id, LOWER(name));

CREATE TABLE vehicles (
    vehicle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    license_plate VARCHAR(30) NOT NULL,
    start_depot_id UUID NOT NULL REFERENCES depots(depot_id),
    end_depot_id UUID NOT NULL REFERENCES depots(depot_id),
    vehicle_type_id UUID NOT NULL REFERENCES vehicle_types(vehicle_type_id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX vehicles_company_license_plate_key ON vehicles (company_id, LOWER(license_plate));
CREATE INDEX idx_vehicles_vehicle_type_id ON vehicles(vehicle_type_id);
CREATE INDEX idx_vehicles_start_depot_id ON vehicles(start_depot_id);
