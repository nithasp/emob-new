import pool from '../database';
import { Queryable } from '../types/database.types';
import { NewVehicle, VehicleFilters, VehicleRow, VehicleUpdate } from '../types/vehicle.types';
import { requireRow } from '../utils/rows';

export class VehicleRepository {
  async listByCompany(
    companyId: string,
    filters: VehicleFilters,
    db: Queryable = pool,
  ): Promise<VehicleRow[]> {
    const values: unknown[] = [companyId];
    const conditions = ['company_id = $1'];
    if (filters.depotId) conditions.push(`start_depot_id = $${values.push(filters.depotId)}`);
    if (filters.vehicleTypeId) conditions.push(`vehicle_type_id = $${values.push(filters.vehicleTypeId)}`);

    const { rows } = await db.query(
      `SELECT * FROM vehicles WHERE ${conditions.join(' AND ')} ORDER BY license_plate`,
      values,
    );
    return rows.map(toVehicleRow);
  }

  async show(companyId: string, vehicleId: string, db: Queryable = pool): Promise<VehicleRow | null> {
    const { rows } = await db.query('SELECT * FROM vehicles WHERE company_id = $1 AND vehicle_id = $2', [
      companyId,
      vehicleId,
    ]);
    return rows[0] ? toVehicleRow(rows[0]) : null;
  }

  async findByIds(companyId: string, vehicleIds: string[], db: Queryable = pool): Promise<VehicleRow[]> {
    if (!vehicleIds.length) return [];
    const { rows } = await db.query(
      'SELECT * FROM vehicles WHERE company_id = $1 AND vehicle_id = ANY($2::uuid[]) ORDER BY license_plate',
      [companyId, vehicleIds],
    );
    return rows.map(toVehicleRow);
  }

  async existingPlates(companyId: string, plates: string[], db: Queryable = pool): Promise<string[]> {
    if (!plates.length) return [];
    const { rows } = await db.query(
      'SELECT license_plate FROM vehicles WHERE company_id = $1 AND LOWER(license_plate) = ANY($2::text[])',
      [companyId, plates.map((plate) => plate.toLowerCase())],
    );
    return rows.map((row) => row.license_plate as string);
  }

  async create(companyId: string, vehicle: NewVehicle, db: Queryable = pool): Promise<VehicleRow> {
    const { rows } = await db.query(
      `INSERT INTO vehicles (company_id, license_plate, start_depot_id, end_depot_id, vehicle_type_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [companyId, vehicle.licensePlate, vehicle.startDepotId, vehicle.endDepotId, vehicle.vehicleTypeId],
    );
    return toVehicleRow(requireRow(rows, 'INSERT INTO vehicles'));
  }

  async update(
    companyId: string,
    vehicleId: string,
    changes: VehicleUpdate,
    db: Queryable = pool,
  ): Promise<VehicleRow | null> {
    const values: unknown[] = [companyId, vehicleId];
    const fields: string[] = [];

    if (changes.licensePlate !== undefined)
      fields.push(`license_plate = $${values.push(changes.licensePlate)}`);
    if (changes.startDepotId !== undefined)
      fields.push(`start_depot_id = $${values.push(changes.startDepotId)}`);
    if (changes.endDepotId !== undefined) fields.push(`end_depot_id = $${values.push(changes.endDepotId)}`);
    if (changes.vehicleTypeId !== undefined) {
      fields.push(`vehicle_type_id = $${values.push(changes.vehicleTypeId)}`);
    }
    if (changes.isActive !== undefined) fields.push(`is_active = $${values.push(changes.isActive)}`);
    if (!fields.length) return this.show(companyId, vehicleId, db);

    const { rows } = await db.query(
      `UPDATE vehicles SET ${fields.join(', ')}, modified_at = NOW()
       WHERE company_id = $1 AND vehicle_id = $2 RETURNING *`,
      values,
    );
    return rows[0] ? toVehicleRow(rows[0]) : null;
  }

  async delete(companyId: string, vehicleId: string, db: Queryable = pool): Promise<boolean> {
    const { rowCount } = await db.query('DELETE FROM vehicles WHERE company_id = $1 AND vehicle_id = $2', [
      companyId,
      vehicleId,
    ]);
    return (rowCount ?? 0) > 0;
  }
}

function toVehicleRow(row: Record<string, unknown>): VehicleRow {
  return {
    vehicleId: row.vehicle_id as string,
    licensePlate: row.license_plate as string,
    startDepotId: row.start_depot_id as string,
    endDepotId: row.end_depot_id as string,
    vehicleTypeId: row.vehicle_type_id as string,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at as Date,
    modifiedAt: row.modified_at as Date,
  };
}
