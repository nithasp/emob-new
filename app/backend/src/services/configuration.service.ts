import { PRODUCT_MASTER_NAME } from '../data/inputFormats';
import { Depot } from '../types/company.types';
import {
  ACTUAL_CATEGORY,
  ActualLocation,
  Configuration,
  ConfigurationRow,
} from '../types/configuration.types';
import { UploadedFile } from '../types/experiment.types';
import { ProductMasterEntry } from '../types/pipeline.types';
import { ConfigurationServiceDeps } from '../types/service.types';
import { AppError } from '../utils/errors';
import { readSheet } from './pipeline/spreadsheet';
import { toProductMaster } from './pipeline/transform.service';
import { configurationPrefix, extensionOf, safeFileName } from './storage/keys';

const notFound = () => new AppError('Configuration not found', 404, 'not_found');

const normaliseHeader = (header: string): string => header.trim().toLowerCase().replace(/\s+/g, '_');

export function createConfigurationService({ configurations, depots, storage }: ConfigurationServiceDeps) {
  const toConfiguration = (row: ConfigurationRow, depotById: Map<string, Depot>): Configuration => {
    const depot = depotById.get(row.depotId) ?? null;
    return {
      ...row,
      companyName: depot?.companyName ?? '',
      depot,
      fileUrl: { fileConfigurationUrl: storage.fileUrl(row.fileBlobPath || null) },
    };
  };

  async function depotMap(companyId: string): Promise<Map<string, Depot>> {
    const list = await depots.listByCompany(companyId);
    return new Map(list.map((depot): [string, Depot] => [depot.depotId, depot]));
  }

  async function toActualLocations(companyId: string): Promise<ActualLocation[]> {
    const rows = await configurations.listByCategory(companyId, ACTUAL_CATEGORY);
    const years = new Map<string, Map<string, ConfigurationRow[]>>();

    for (const row of rows) {
      const year = String(row.timestamp.getFullYear());
      const month = String(row.timestamp.getMonth() + 1).padStart(2, '0');
      const months = years.get(year) ?? new Map<string, ConfigurationRow[]>();
      months.set(month, [...(months.get(month) ?? []), row]);
      years.set(year, months);
    }

    return [...years.entries()].map(([year, months]) => ({
      year,
      children: [...months.entries()].map(([month, files]) => ({
        month,
        children: files.map((file) => ({
          fileName: file.name,
          fileBlobPath: file.fileBlobPath,
          timestamp: file.timestamp,
          fileUrl: { fileActualLocationUrl: storage.fileUrl(file.fileBlobPath) },
        })),
      })),
    }));
  }

  async function store(companyId: string, configurationId: string, upload: UploadedFile): Promise<string> {
    const key = `${configurationPrefix(companyId, configurationId)}/${Date.now()}/${safeFileName(upload.filename, 'configuration.xlsx')}`;
    await storage.put(key, upload.content);
    return key;
  }

  async function assertColumns(upload: UploadedFile, columns: string[]): Promise<void> {
    if (extensionOf(upload.filename) !== 'xlsx') {
      throw new AppError('Configuration files must be Excel workbooks (.xlsx)', 400, 'invalid_request');
    }
    const sheet = await readSheet(upload.content, upload.filename);
    const present = new Set(sheet.headers.map(normaliseHeader));
    const missing = columns.filter((column) => !present.has(normaliseHeader(column)));
    if (missing.length) {
      throw new AppError(`The file is missing these columns: ${missing.join(', ')}`, 400, 'invalid_request');
    }
  }

  return {
    async list(companyId: string): Promise<Configuration[]> {
      const [rows, depotById] = await Promise.all([
        configurations.listByCompany(companyId),
        depotMap(companyId),
      ]);
      return rows.map((row) => toConfiguration(row, depotById));
    },

    async listForDepots(companyId: string, depotIds: string[]): Promise<ConfigurationRow[]> {
      const rows = await configurations.listByCompany(companyId);
      return rows.filter((row) => depotIds.includes(row.depotId) && row.fileBlobPath !== '');
    },

    async get(companyId: string, id: string): Promise<Configuration> {
      const row = await configurations.show(companyId, id);
      if (!row) throw notFound();
      return toConfiguration(row, await depotMap(companyId));
    },

    async replaceFile(companyId: string, id: string, upload: UploadedFile): Promise<Configuration> {
      const row = await configurations.show(companyId, id);
      if (!row) throw notFound();
      await assertColumns(upload, row.columns);

      const depotById = await depotMap(companyId);

      if (row.category === ACTUAL_CATEGORY && !row.fileBlobPath) {
        const created = await configurations.create({
          companyId,
          depotId: row.depotId,
          name: safeFileName(upload.filename, 'actual_location.xlsx'),
          category: ACTUAL_CATEGORY,
          type: row.type,
          fileBlobPath: '',
          columns: row.columns,
          replace: false,
        });
        const key = await store(companyId, created.id, upload);
        const saved = await configurations.replaceFile(companyId, created.id, key);
        return toConfiguration(saved ?? created, depotById);
      }

      const key = await store(companyId, row.id, upload);
      const saved = await configurations.replaceFile(companyId, row.id, key);
      if (!saved) throw notFound();
      if (row.fileBlobPath) await storage.delete(row.fileBlobPath);
      return toConfiguration(saved, depotById);
    },

    async actualLocation(companyId: string, blobPath: string): Promise<ActualLocation | null> {
      const all = await toActualLocations(companyId);
      const holding = all.find((year) =>
        year.children.some((month) => month.children.some((file) => file.fileBlobPath === blobPath)),
      );
      return holding ?? all.at(-1) ?? null;
    },

    async uploadActualLocation(companyId: string, upload: UploadedFile): Promise<ActualLocation | null> {
      const rows = await configurations.listByCompany(companyId);
      const slot = rows.find((row) => row.category === ACTUAL_CATEGORY && !row.fileBlobPath);
      if (!slot) throw new AppError('No depot accepts actual-location files', 404, 'not_found');

      const saved = await this.replaceFile(companyId, slot.id, upload);
      return this.actualLocation(companyId, saved.fileBlobPath);
    },

    async productMaster(companyId: string, depotId: string): Promise<Map<string, ProductMasterEntry> | null> {
      const row = await configurations.findByDepotAndName(companyId, depotId, PRODUCT_MASTER_NAME);
      const object = row ? await storage.get(row.fileBlobPath) : null;
      if (!row || !object) return null;
      return toProductMaster(await readSheet(object.body, row.fileBlobPath));
    },
  };
}

export type ConfigurationService = ReturnType<typeof createConfigurationService>;
