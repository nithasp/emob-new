import pool from '../database';
import { Depot, DepotInputData, NewDepot, NewDepotInputData } from '../types/company.types';
import { Queryable } from '../types/database.types';
import { requireRow } from '../utils/rows';

const DEPOT_FIELDS = `d.depot_id, d.depot_name, d.latitude, d.longitude, d.time_window_early, d.time_window_late,
  d.created_at, d.updated_at, c.company_name`;

const SELECT_DEPOTS = `
  SELECT ${DEPOT_FIELDS},
    COALESCE(
      (SELECT json_agg(json_build_object(
          'keyName', i.key_name,
          'displayName', i.display_name,
          'columnRequired', i.column_required,
          'fileFormatType', i.file_format_type,
          'required', i.required,
          'createdAt', i.created_at,
          'modifiedAt', i.modified_at
        ) ORDER BY i.sort_order, i.id)
       FROM depot_input_data i WHERE i.depot_id = d.depot_id),
      '[]'::json
    ) AS inputdata
  FROM depots d JOIN companies c ON c.id = d.company_id`;

export class DepotRepository {
  async listByCompany(companyId: string, db: Queryable = pool): Promise<Depot[]> {
    const { rows } = await db.query(
      `${SELECT_DEPOTS} WHERE d.company_id = $1 ORDER BY d.sort_order, d.depot_name`,
      [companyId],
    );
    return rows.map(toDepot);
  }

  async findByIds(companyId: string, depotIds: string[], db: Queryable = pool): Promise<Depot[]> {
    if (!depotIds.length) return [];
    const { rows } = await db.query(
      `${SELECT_DEPOTS} WHERE d.company_id = $1 AND d.depot_id = ANY($2::uuid[]) ORDER BY d.sort_order, d.depot_name`,
      [companyId, depotIds],
    );
    return rows.map(toDepot);
  }

  async create(depot: NewDepot, db: Queryable = pool): Promise<string> {
    const { rows } = await db.query(
      `INSERT INTO depots (company_id, depot_name, latitude, longitude, time_window_early, time_window_late, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING depot_id`,
      [
        depot.companyId,
        depot.depotName,
        depot.latitude,
        depot.longitude,
        depot.timeWindowEarly,
        depot.timeWindowLate,
        depot.sortOrder,
      ],
    );
    return requireRow(rows, 'INSERT INTO depots').depot_id as string;
  }

  async addInputData(input: NewDepotInputData, db: Queryable = pool): Promise<void> {
    await db.query(
      `INSERT INTO depot_input_data
         (depot_id, key_name, display_name, column_required, file_format_type, required, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        input.depotId,
        input.keyName,
        input.displayName,
        input.columnRequired,
        input.fileFormatType,
        input.required,
        input.sortOrder,
      ],
    );
  }
}

function toDepot(row: Record<string, unknown>): Depot {
  const companyName = row.company_name as string;
  const depotId = row.depot_id as string;
  const inputs = (row.inputdata as Array<Record<string, unknown>> | null) ?? [];

  return {
    companyName,
    depotId,
    depotName: row.depot_name as string,
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    timeWindowEarly: row.time_window_early as string,
    timeWindowLate: row.time_window_late as string,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
    inputdata: inputs.map((input): DepotInputData => ({
      companyName,
      depotId,
      keyName: input.keyName as string,
      displayName: input.displayName as string,
      columnRequired: (input.columnRequired as string[] | null) ?? [],
      fileFormatType: input.fileFormatType as string,
      required: Boolean(input.required),
      createdAt: new Date(input.createdAt as string),
      modifiedAt: new Date(input.modifiedAt as string),
    })),
  };
}
