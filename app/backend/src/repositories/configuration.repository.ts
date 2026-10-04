import pool from '../database';
import { ConfigurationRow, NewConfiguration } from '../types/configuration.types';
import { Queryable } from '../types/database.types';
import { requireRow } from '../utils/rows';

export class ConfigurationRepository {
  async listByCompany(companyId: string, db: Queryable = pool): Promise<ConfigurationRow[]> {
    const { rows } = await db.query(
      `SELECT cf.* FROM configurations cf JOIN depots d ON d.depot_id = cf.depot_id
       WHERE cf.company_id = $1
       ORDER BY d.sort_order, d.depot_name, cf.category, cf."timestamp", cf.name`,
      [companyId],
    );
    return rows.map(toConfiguration);
  }

  async show(companyId: string, id: string, db: Queryable = pool): Promise<ConfigurationRow | null> {
    const { rows } = await db.query('SELECT * FROM configurations WHERE company_id = $1 AND id = $2', [
      companyId,
      id,
    ]);
    return rows[0] ? toConfiguration(rows[0]) : null;
  }

  async findByBlobPath(
    companyId: string,
    blobPath: string,
    db: Queryable = pool,
  ): Promise<ConfigurationRow | null> {
    const { rows } = await db.query(
      'SELECT * FROM configurations WHERE company_id = $1 AND file_blob_path = $2',
      [companyId, blobPath],
    );
    return rows[0] ? toConfiguration(rows[0]) : null;
  }

  async findByDepotAndName(
    companyId: string,
    depotId: string,
    name: string,
    db: Queryable = pool,
  ): Promise<ConfigurationRow | null> {
    const { rows } = await db.query(
      `SELECT * FROM configurations
       WHERE company_id = $1 AND depot_id = $2 AND LOWER(name) = LOWER($3) AND file_blob_path <> ''
       ORDER BY "timestamp" DESC LIMIT 1`,
      [companyId, depotId, name],
    );
    return rows[0] ? toConfiguration(rows[0]) : null;
  }

  async listByCategory(
    companyId: string,
    category: string,
    db: Queryable = pool,
  ): Promise<ConfigurationRow[]> {
    const { rows } = await db.query(
      `SELECT * FROM configurations
       WHERE company_id = $1 AND category = $2 AND file_blob_path <> ''
       ORDER BY "timestamp"`,
      [companyId, category],
    );
    return rows.map(toConfiguration);
  }

  async create(configuration: NewConfiguration, db: Queryable = pool): Promise<ConfigurationRow> {
    const { rows } = await db.query(
      `INSERT INTO configurations
         (company_id, depot_id, name, category, type, file_blob_path, columns, replace, "timestamp")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, NOW())) RETURNING *`,
      [
        configuration.companyId,
        configuration.depotId,
        configuration.name,
        configuration.category,
        configuration.type,
        configuration.fileBlobPath,
        configuration.columns,
        configuration.replace,
        configuration.timestamp ?? null,
      ],
    );
    return toConfiguration(requireRow(rows, 'INSERT INTO configurations'));
  }

  async replaceFile(
    companyId: string,
    id: string,
    fileBlobPath: string,
    db: Queryable = pool,
  ): Promise<ConfigurationRow | null> {
    const { rows } = await db.query(
      `UPDATE configurations SET file_blob_path = $3, "timestamp" = NOW()
       WHERE company_id = $1 AND id = $2 RETURNING *`,
      [companyId, id, fileBlobPath],
    );
    return rows[0] ? toConfiguration(rows[0]) : null;
  }
}

function toConfiguration(row: Record<string, unknown>): ConfigurationRow {
  return {
    id: row.id as string,
    depotId: row.depot_id as string,
    name: row.name as string,
    category: row.category as string,
    type: row.type as string,
    fileBlobPath: row.file_blob_path as string,
    columns: (row.columns as string[] | null) ?? [],
    replace: Boolean(row.replace),
    timestamp: row.timestamp as Date,
  };
}
