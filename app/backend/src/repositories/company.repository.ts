import pool from '../database';
import { Company, DepotType } from '../types/company.types';
import { Queryable } from '../types/database.types';
import { requireRow } from '../utils/rows';

export class CompanyRepository {
  async show(id: string, db: Queryable = pool): Promise<Company | null> {
    const { rows } = await db.query('SELECT * FROM companies WHERE id = $1', [id]);
    return rows[0] ? toCompany(rows[0]) : null;
  }

  async findByName(companyName: string, db: Queryable = pool): Promise<Company | null> {
    const { rows } = await db.query('SELECT * FROM companies WHERE LOWER(company_name) = LOWER($1)', [
      companyName,
    ]);
    return rows[0] ? toCompany(rows[0]) : null;
  }

  async upsert(companyName: string, depotType: DepotType, db: Queryable = pool): Promise<Company> {
    const { rows } = await db.query(
      `INSERT INTO companies (company_name, depot_type) VALUES ($1, $2)
       ON CONFLICT (LOWER(company_name)) DO UPDATE SET depot_type = EXCLUDED.depot_type
       RETURNING *`,
      [companyName, depotType],
    );
    return toCompany(requireRow(rows, 'INSERT INTO companies'));
  }
}

function toCompany(row: Record<string, unknown>): Company {
  return {
    id: row.id as string,
    companyName: row.company_name as string,
    depotType: row.depot_type as DepotType,
  };
}
