import pool from '../database';
import { Queryable } from '../types/database.types';
import {
  ExperimentChanges,
  ExperimentFiles,
  ExperimentInputFile,
  ExperimentRow,
  ExperimentRunKind,
  ExperimentStatus,
  NewExperiment,
  emptyExperimentFiles,
} from '../types/experiment.types';
import { DynamicParameter } from '../types/parameter.types';
import { requireRow } from '../utils/rows';

const SELECT = `
  SELECT e.*,
    TRIM(CONCAT(u.first_name, ' ', u.last_name)) AS triggered_by_name,
    COALESCE(
      (SELECT array_agg(ed.depot_id::text ORDER BY ed.position) FROM experiment_depots ed WHERE ed.run_id = e.run_id),
      '{}'::text[]
    ) AS depot_ids
  FROM experiments e JOIN users u ON u.id = e.triggered_by`;

const COLUMNS: Record<keyof ExperimentChanges, { column: string; json?: boolean }> = {
  name: { column: 'name' },
  run: { column: 'run' },
  status: { column: 'status' },
  timeStart: { column: 'time_start' },
  timeEnd: { column: 'time_end' },
  timeDuration: { column: 'time_duration' },
  countGeocoding: { column: 'count_geocoding' },
  countReroute: { column: 'count_reroute' },
  inputdata: { column: 'inputdata', json: true },
  files: { column: 'files', json: true },
  parameters: { column: 'parameters', json: true },
  errorMessage: { column: 'error_message' },
  timestamp: { column: '"timestamp"' },
};

function assignments(changes: ExperimentChanges, values: unknown[]): string[] {
  const fields: string[] = [];
  for (const key of Object.keys(COLUMNS) as Array<keyof ExperimentChanges>) {
    const value = changes[key];
    if (value === undefined) continue;
    const { column, json } = COLUMNS[key];
    fields.push(`${column} = $${values.push(json ? JSON.stringify(value) : value)}`);
  }
  return fields;
}

export class ExperimentRepository {
  async listByCompany(companyId: string, db: Queryable = pool): Promise<ExperimentRow[]> {
    const { rows } = await db.query(`${SELECT} WHERE e.company_id = $1 ORDER BY e."timestamp" DESC`, [
      companyId,
    ]);
    return rows.map(toExperiment);
  }

  async show(companyId: string, runId: string, db: Queryable = pool): Promise<ExperimentRow | null> {
    const { rows } = await db.query(`${SELECT} WHERE e.company_id = $1 AND e.run_id = $2`, [
      companyId,
      runId,
    ]);
    return rows[0] ? toExperiment(rows[0]) : null;
  }

  // Used by the solver job, which works on a run it already owns and has no request to scope by
  async showById(runId: string, db: Queryable = pool): Promise<ExperimentRow | null> {
    const { rows } = await db.query(`${SELECT} WHERE e.run_id = $1`, [runId]);
    return rows[0] ? toExperiment(rows[0]) : null;
  }

  async listPending(db: Queryable = pool): Promise<ExperimentRow[]> {
    const { rows } = await db.query(
      `${SELECT} WHERE e.status IN ('Queued', 'InProgress') ORDER BY e."timestamp"`,
    );
    return rows.map(toExperiment);
  }

  async create(experiment: NewExperiment, db: Queryable = pool): Promise<string> {
    const { rows } = await db.query(
      `INSERT INTO experiments (company_id, name, triggered_by, group_id, run, status, "timestamp", files)
       VALUES ($1, $2, $3, COALESCE($4::uuid, gen_random_uuid()), $5, $6, COALESCE($7, NOW()), $8)
       RETURNING run_id`,
      [
        experiment.companyId,
        experiment.name,
        experiment.triggeredBy,
        experiment.groupId ?? null,
        experiment.run ?? 'Original',
        experiment.status ?? 'Initializing',
        experiment.timestamp ?? null,
        JSON.stringify(emptyExperimentFiles()),
      ],
    );
    return requireRow(rows, 'INSERT INTO experiments').run_id as string;
  }

  async update(runId: string, changes: ExperimentChanges, db: Queryable = pool): Promise<void> {
    const values: unknown[] = [runId];
    const fields = assignments(changes, values);
    if (!fields.length) return;
    await db.query(
      `UPDATE experiments SET ${fields.join(', ')}, updated_at = NOW() WHERE run_id = $1`,
      values,
    );
  }

  // One conditional UPDATE, so a status only moves when the run is still in a state it may leave:
  // a cancel that races the solver job leaves exactly one of them the winner
  async transition(
    runId: string,
    from: ExperimentStatus[],
    changes: ExperimentChanges,
    db: Queryable = pool,
  ): Promise<boolean> {
    const values: unknown[] = [runId, from];
    const fields = assignments(changes, values);
    if (!fields.length) return false;
    const { rowCount } = await db.query(
      `UPDATE experiments SET ${fields.join(', ')}, updated_at = NOW()
       WHERE run_id = $1 AND status = ANY($2::text[])`,
      values,
    );
    return (rowCount ?? 0) > 0;
  }

  async setDepots(runId: string, depotIds: string[], db: Queryable = pool): Promise<void> {
    await db.query('DELETE FROM experiment_depots WHERE run_id = $1', [runId]);
    for (const [position, depotId] of depotIds.entries()) {
      await db.query('INSERT INTO experiment_depots (run_id, depot_id, position) VALUES ($1, $2, $3)', [
        runId,
        depotId,
        position,
      ]);
    }
  }

  async deleteByCompany(companyId: string, db: Queryable = pool): Promise<void> {
    await db.query('DELETE FROM experiments WHERE company_id = $1', [companyId]);
  }
}

function toExperiment(row: Record<string, unknown>): ExperimentRow {
  const files = row.files as Partial<ExperimentFiles> | null;
  const empty = emptyExperimentFiles();

  return {
    runId: row.run_id as string,
    companyId: row.company_id as string,
    groupId: row.group_id as string,
    name: row.name as string,
    run: row.run as ExperimentRunKind,
    status: row.status as ExperimentStatus,
    triggeredBy: row.triggered_by as string,
    triggeredByName: row.triggered_by_name as string,
    timestamp: row.timestamp as Date,
    timeStart: (row.time_start as Date | null) ?? null,
    timeEnd: (row.time_end as Date | null) ?? null,
    timeDuration: (row.time_duration as number | null) ?? null,
    countGeocoding: row.count_geocoding as number,
    countReroute: row.count_reroute as number,
    inputdata: (row.inputdata as ExperimentInputFile[] | null) ?? [],
    files: {
      transform: { ...empty.transform, ...files?.transform },
      validate: { ...empty.validate, ...files?.validate },
      plan: { ...empty.plan, ...files?.plan },
      result: files?.result ?? null,
    },
    parameters: (row.parameters as DynamicParameter[] | null) ?? [],
    errorMessage: (row.error_message as string | null) ?? null,
    depotIds: (row.depot_ids as string[] | null) ?? [],
  };
}
