import pool from '../database';
import { Queryable } from '../types/database.types';
import { DynamicParameter, JoiConfig, LocalizedText, NewDynamicParameter } from '../types/parameter.types';

const SELECT = `SELECT p.*, c.company_name FROM dynamic_parameters p JOIN companies c ON c.id = p.company_id`;
const ORDER = 'ORDER BY p.sort_order, p.created_at, p.key_name';

export class DynamicParameterRepository {
  // A depot's own parameters come first; company-wide ones (no depot) are returned with them so
  // the client can fall back to those for any key the depot does not override
  async listForDepot(
    companyId: string,
    depotId: string | null,
    db: Queryable = pool,
  ): Promise<DynamicParameter[]> {
    if (!depotId) {
      const { rows } = await db.query(`${SELECT} WHERE p.company_id = $1 ${ORDER}`, [companyId]);
      return rows.map(toDynamicParameter);
    }
    const { rows } = await db.query(
      `${SELECT} WHERE p.company_id = $1 AND (p.depot_id = $2 OR p.depot_id IS NULL) ${ORDER}`,
      [companyId, depotId],
    );
    return rows.map(toDynamicParameter);
  }

  async show(companyId: string, id: string, db: Queryable = pool): Promise<DynamicParameter | null> {
    const { rows } = await db.query(`${SELECT} WHERE p.company_id = $1 AND p.id = $2`, [companyId, id]);
    return rows[0] ? toDynamicParameter(rows[0]) : null;
  }

  async create(parameter: NewDynamicParameter, db: Queryable = pool): Promise<void> {
    await db.query(
      `INSERT INTO dynamic_parameters
         (company_id, depot_id, category, key_name, display_name, value_type, value, joi_config, is_required,
          default_value, description, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        parameter.companyId,
        parameter.depotId,
        JSON.stringify(parameter.category),
        parameter.keyName,
        JSON.stringify(parameter.displayName),
        parameter.valueType,
        parameter.value,
        JSON.stringify(parameter.joiConfig),
        parameter.isRequired,
        parameter.defaultValue,
        JSON.stringify(parameter.description),
        parameter.sortOrder,
      ],
    );
  }

  async updateValue(companyId: string, id: string, value: string, db: Queryable = pool): Promise<boolean> {
    const { rowCount } = await db.query(
      'UPDATE dynamic_parameters SET value = $3, updated_at = NOW() WHERE company_id = $1 AND id = $2',
      [companyId, id, value],
    );
    return (rowCount ?? 0) > 0;
  }

  async delete(companyId: string, id: string, db: Queryable = pool): Promise<boolean> {
    const { rowCount } = await db.query('DELETE FROM dynamic_parameters WHERE company_id = $1 AND id = $2', [
      companyId,
      id,
    ]);
    return (rowCount ?? 0) > 0;
  }
}

const NUMBER_TYPE = /^number/i;

function toDynamicParameter(row: Record<string, unknown>): DynamicParameter {
  const valueType = row.value_type as string;
  const stored = row.value as string | null;

  return {
    companyName: row.company_name as string,
    id: row.id as string,
    category: row.category as LocalizedText,
    depotId: (row.depot_id as string | null) ?? null,
    keyName: row.key_name as string,
    displayName: row.display_name as LocalizedText,
    valueType,
    value: stored !== null && NUMBER_TYPE.test(valueType) && stored !== '' ? Number(stored) : stored,
    joiConfig: row.joi_config as JoiConfig,
    isRequired: Boolean(row.is_required),
    defaultValue: (row.default_value as string | null) ?? null,
    description: row.description as LocalizedText,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}
