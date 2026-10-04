import pool from '../database';
import { Queryable } from '../types/database.types';
import {
  AccessType,
  Dimension,
  VehicleBreak,
  VehicleProfileType,
  VehicleType,
  VehicleTypeOptionalValues,
  VehicleTypeWrite,
} from '../types/vehicle.types';
import { requireRow } from '../utils/rows';

// Company scoping is part of every statement, so an id from another tenant simply matches no row
// (OWASP API1)
export class VehicleTypeRepository {
  async listByCompany(companyId: string, db: Queryable = pool): Promise<VehicleType[]> {
    const { rows } = await db.query(
      'SELECT * FROM vehicle_types WHERE company_id = $1 ORDER BY created_at, name',
      [companyId],
    );
    return rows.map(toVehicleType);
  }

  async show(companyId: string, vehicleTypeId: string, db: Queryable = pool): Promise<VehicleType | null> {
    const { rows } = await db.query(
      'SELECT * FROM vehicle_types WHERE company_id = $1 AND vehicle_type_id = $2',
      [companyId, vehicleTypeId],
    );
    return rows[0] ? toVehicleType(rows[0]) : null;
  }

  async findByIds(companyId: string, ids: string[], db: Queryable = pool): Promise<VehicleType[]> {
    if (!ids.length) return [];
    const { rows } = await db.query(
      'SELECT * FROM vehicle_types WHERE company_id = $1 AND vehicle_type_id = ANY($2::uuid[])',
      [companyId, ids],
    );
    return rows.map(toVehicleType);
  }

  async create(companyId: string, input: VehicleTypeWrite, db: Queryable = pool): Promise<VehicleType> {
    const { rows } = await db.query(
      `INSERT INTO vehicle_types (
         company_id, name, access, allowed_breaks, dimension, maximum_weight_capacity, maximum_volume_capacity,
         time_window_early, time_window_late, maximum_distance, maximum_duration, vehicle_group_id, fixed_cost,
         unit_distance_cost, unit_duration_cost, vehicle_profile_type, maxpallet, zone,
         is_vehicle_available, max_trip, loading_duration
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       RETURNING *`,
      [
        companyId,
        ...formValues(input),
        input.isVehicleAvailable ?? true,
        input.maxTrip ?? null,
        input.loadingDuration ?? null,
      ],
    );
    return toVehicleType(requireRow(rows, 'INSERT INTO vehicle_types'));
  }

  async update(
    companyId: string,
    vehicleTypeId: string,
    input: VehicleTypeWrite,
    db: Queryable = pool,
  ): Promise<VehicleType | null> {
    const values: unknown[] = [companyId, vehicleTypeId, ...formValues(input)];
    const optional = optionalAssignments(input, values);

    const { rows } = await db.query(
      `UPDATE vehicle_types SET
         name = $3, access = $4, allowed_breaks = $5, dimension = $6, maximum_weight_capacity = $7,
         maximum_volume_capacity = $8, time_window_early = $9, time_window_late = $10, maximum_distance = $11,
         maximum_duration = $12, vehicle_group_id = $13, fixed_cost = $14, unit_distance_cost = $15,
         unit_duration_cost = $16, vehicle_profile_type = $17, maxpallet = $18, zone = $19,
         ${optional}modified_at = NOW()
       WHERE company_id = $1 AND vehicle_type_id = $2
       RETURNING *`,
      values,
    );
    return rows[0] ? toVehicleType(rows[0]) : null;
  }

  async delete(companyId: string, vehicleTypeId: string, db: Queryable = pool): Promise<boolean> {
    const { rowCount } = await db.query(
      'DELETE FROM vehicle_types WHERE company_id = $1 AND vehicle_type_id = $2',
      [companyId, vehicleTypeId],
    );
    return (rowCount ?? 0) > 0;
  }
}

function formValues(input: VehicleTypeWrite): unknown[] {
  return [
    input.name,
    input.access,
    JSON.stringify(input.allowedBreaks),
    input.dimension ? JSON.stringify(input.dimension) : null,
    input.maximumWeightCapacity,
    input.maximumVolumeCapacity,
    input.timeWindowEarly,
    input.timeWindowLate,
    input.maximumDistance,
    input.maximumDuration,
    input.vehicleGroupId,
    input.fixedCost,
    input.unitDistanceCost,
    input.unitDurationCost,
    input.vehicleProfileType,
    input.maxpallet,
    input.zone,
  ];
}

function optionalAssignments(input: VehicleTypeOptionalValues, values: unknown[]): string {
  const assignments: string[] = [];
  if (input.isVehicleAvailable !== undefined) {
    assignments.push(`is_vehicle_available = $${values.push(input.isVehicleAvailable)}`);
  }
  if (input.maxTrip !== undefined) assignments.push(`max_trip = $${values.push(input.maxTrip)}`);
  if (input.loadingDuration !== undefined) {
    assignments.push(`loading_duration = $${values.push(input.loadingDuration)}`);
  }
  return assignments.length ? `${assignments.join(', ')}, ` : '';
}

export function toVehicleType(row: Record<string, unknown>): VehicleType {
  return {
    vehicleTypeId: row.vehicle_type_id as string,
    name: row.name as string,
    access: (row.access as AccessType[] | null) ?? [],
    allowedBreaks: (row.allowed_breaks as VehicleBreak[] | null) ?? [],
    dimension: (row.dimension as Dimension | null) ?? null,
    maximumWeightCapacity: row.maximum_weight_capacity as number | null,
    maximumVolumeCapacity: row.maximum_volume_capacity as number | null,
    timeWindowEarly: row.time_window_early as string | null,
    timeWindowLate: row.time_window_late as string | null,
    maximumDistance: row.maximum_distance as number | null,
    maximumDuration: row.maximum_duration as string | null,
    vehicleGroupId: row.vehicle_group_id as string | null,
    fixedCost: row.fixed_cost as number | null,
    unitDistanceCost: row.unit_distance_cost as number | null,
    unitDurationCost: row.unit_duration_cost as number | null,
    vehicleProfileType: row.vehicle_profile_type as VehicleProfileType,
    isVehicleAvailable: Boolean(row.is_vehicle_available),
    maxpallet: row.maxpallet as number | null,
    zone: row.zone as string | null,
    maxTrip: row.max_trip as number | null,
    loadingDuration: row.loading_duration as string | null,
    createdAt: row.created_at as Date,
    modifiedAt: row.modified_at as Date,
  };
}
