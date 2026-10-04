import { Injectable, inject } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';
import { LoggerService } from '@core/services/logger.service';
import { FileWithCategory, PreOrderFileItem } from '../../models/pre-order.model';
import { RunUiService } from './run-ui.service';
import { RunUploadFileService } from './run-upload-file.service';

@Injectable()
export class RunFileColumnService {
  private readonly logger = inject(LoggerService);

  // Store file columns when first uploaded for later validation
  fileColumnsCache: { [fileId: string]: string[] } = {};

  constructor(
    private readonly toastr: ToastrService,
    private readonly transloco: TranslocoService,
    private readonly ui: RunUiService,
    private readonly files: RunUploadFileService,
  ) {}

  private parseCsvHeaderColumnNames(csvText: string): string[] {
    const text = (csvText || '').replace(/^\uFEFF/, '');
    const firstLine = text.split(/\r\n|\n|\r/)[0] || '';
    if (!firstLine.trim()) return [];

    const delimiters = [',', ';', '\t', '|'];
    const count = (line: string, ch: string) =>
      Array.from(line).filter((c) => c === ch).length;
    const delimiter =
      delimiters
        .map((d) => ({ d, n: count(firstLine, d) }))
        .sort((a, b) => b.n - a.n)[0]?.d || ',';

    const cols: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < firstLine.length; i++) {
      const ch = firstLine[i];
      if (ch === '"') {
        const next = firstLine[i + 1];
        if (inQuotes && next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (!inQuotes && ch === delimiter) {
        cols.push(cur.trim().replace(/^"+|"+$/g, ''));
        cur = '';
        continue;
      }
      cur += ch;
    }
    cols.push(cur.trim().replace(/^"+|"+$/g, ''));

    return cols.filter(Boolean);
  }

  findMatchingInputDataItem(
    columnNames: string[],
  ): { keyName: string; displayName: string; columnRequired: string[] } | null {
    return (
      this.files.depotInputDataItems.find((item) => {
        return item.columnRequired.every((requiredCol) =>
          columnNames.includes(requiredCol),
        );
      }) || null
    );
  }

  async validateSingleFileAgainstDepot(
    file: FileWithCategory,
    fileId?: string,
  ): Promise<{
    isValid: boolean;
    keyName?: string;
    displayName?: string;
    isFirstOfType?: boolean;
    columnNames?: string[];
  }> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e: ProgressEvent<FileReader>) => {
        try {
          const result = e.target?.result;
          const fileName = (file?.name || '').toLowerCase();
          const isCsv = fileName.endsWith('.csv');

          let columnNames: string[] = [];
          if (isCsv) {
            if (typeof result !== 'string') {
              resolve({ isValid: false });
              return;
            }
            columnNames = this.parseCsvHeaderColumnNames(result);
          } else {
            if (!(result instanceof ArrayBuffer)) {
              resolve({ isValid: false });
              return;
            }
            const arrayBuffer = result;
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);

            let worksheet: ExcelJS.Worksheet | undefined =
              workbook.getWorksheet(1);
            if (!worksheet) {
              const normalize = (name: string) =>
                name
                  .trim()
                  .toLowerCase()
                  .replace(/[\s_-]/g, '');

              const allSheets = workbook.worksheets.map(
                (ws: ExcelJS.Worksheet) => ({
                  name: ws.name,
                  normalized: normalize(ws.name),
                }),
              );

              this.logger.log(
                'Detected sheets:',
                allSheets.map((sheet) => sheet.name),
              );

              worksheet =
                workbook.worksheets.find(
                  (ws: ExcelJS.Worksheet) => ws.getRow(1)?.cellCount > 0,
                ) || workbook.worksheets[0];
            }

            columnNames = (
              worksheet!.getRow(1).values as (string | undefined)[]
            ).filter((value) => typeof value === 'string') as string[];
          }

          // Cache column names for later validation if fileId is provided
          if (fileId) {
            this.fileColumnsCache[fileId] = columnNames;
            this.logger.log('Cached columns for file:', fileId, columnNames);
          }

          const matchingInputDataItem =
            this.findMatchingInputDataItem(columnNames);
          if (matchingInputDataItem) {
            resolve({
              isValid: true,
              keyName: matchingInputDataItem.keyName,
              displayName: matchingInputDataItem.displayName,
              isFirstOfType: true,
              columnNames: columnNames,
            });
          } else {
            // Show missing columns for each required input data type
            const validationErrors = [];
            for (const item of this.files.depotInputDataItems) {
              const missingColumns = item.columnRequired.filter(
                (col) => !columnNames.includes(col),
              );
              if (missingColumns.length === item.columnRequired.length) {
                // All required columns are missing
                validationErrors.push(
                  `<strong>${this.transloco.translate(
                    'file_for',
                    {},
                    'index',
                  )} "${item.displayName}" ${this.transloco.translate(
                    'missing_columns_as_follows',
                    {},
                    'index',
                  )}</strong><span>:</span> <br/><ul>${item.columnRequired
                    .map((col) => `<li>${col}</li>`)
                    .join('')}</ul>`,
                );
              } else if (missingColumns.length > 0) {
                // Some columns are missing
                validationErrors.push(
                  `<strong>${this.transloco.translate(
                    'file_for',
                    {},
                    'index',
                  )}" ${item.displayName}" ${this.transloco.translate(
                    'missing_columns_as_follows',
                    {},
                    'index',
                  )}</strong><span>:</span> <ul>${missingColumns
                    .map((col) => `<li>${col}</li>`)
                    .join('')}</ul>`,
                );
              }
            }
            this.logger.log('column_name_mismatch_template 1');
            this.ui.showInvalidModal(
              `${this.transloco.translate(
                'column_name_mismatch_template',
                {},
                'index',
              )}`,
              validationErrors,
            );
            resolve({ isValid: false, columnNames: columnNames });
            this.logger.log('column_name_mismatch_template 2');
          }
        } catch (error) {
          this.logger.error('Error validating file:', error);
          resolve({ isValid: false });
        }
      };
      const fileName = (file?.name || '').toLowerCase();
      if (fileName.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  }

  async validateFileColumnsForCategory(
    fileObj: PreOrderFileItem,
    selectedDisplayName: string,
  ): Promise<boolean> {
    this.logger.log('validateFileColumnsForCategory called', {
      fileId: fileObj.id,
      selectedDisplayName,
      isFileWithCategory: this.files.isFileWithCategory(fileObj.file),
      fileName: fileObj.file.name,
      hasCachedColumns: !!this.fileColumnsCache[fileObj.id],
    });

    // Find the required columns for the selected category
    const targetItem = this.files.depotInputDataItems.find(
      (item) => item.displayName === selectedDisplayName,
    );

    if (!targetItem) {
      this.logger.error(
        'Target item not found for displayName:',
        selectedDisplayName,
      );
      return false;
    }

    this.logger.log('Target item found:', {
      keyName: targetItem.keyName,
      displayName: targetItem.displayName,
      columnRequired: targetItem.columnRequired,
    });

    // First, try to use cached columns (from when file was first uploaded)
    const cachedColumns = this.fileColumnsCache[fileObj.id];
    if (cachedColumns && cachedColumns.length > 0) {
      this.logger.log('Using cached columns for validation:', cachedColumns);
      return this.validateColumnsAgainstCategory(
        cachedColumns,
        targetItem,
        fileObj.file.name,
      );
    }

    // If this is a PreOrderFileDescriptor (loaded from server), we cannot validate actual file columns
    // In this case, we'll assume it's valid
    if (!this.files.isFileWithCategory(fileObj.file)) {
      this.logger.log(
        'File is PreOrderFileDescriptor and no cached columns, skipping validation',
      );
      return true;
    }

    // Check if the file is a valid File object
    const file = fileObj.file as FileWithCategory;
    if (!file || !(file instanceof File)) {
      this.logger.error('File is not a valid File object:', file);
      this.toastr.error(
        this.transloco.translate('error_reading_file', {}, 'index'),
      );
      return false;
    }

    this.logger.log('Starting file read for validation:', file.name);

    // Read the file and get its columns
    return new Promise<boolean>((resolve) => {
      const reader = new FileReader();

      reader.onerror = () => {
        this.logger.error('FileReader error:', reader.error);
        this.toastr.error(
          this.transloco.translate('error_reading_file', {}, 'index'),
        );
        resolve(false);
      };

      reader.onload = async (e: ProgressEvent<FileReader>) => {
        try {
          const result = e.target?.result;
          const fileName = (fileObj.file?.name || '').toLowerCase();
          const isCsv = fileName.endsWith('.csv');

          let columnNames: string[] = [];
          if (isCsv) {
            if (typeof result !== 'string') {
              this.logger.error('CSV result is not string');
              resolve(false);
              return;
            }
            columnNames = this.parseCsvHeaderColumnNames(result);
          } else {
            if (!(result instanceof ArrayBuffer)) {
              this.logger.error('Result is not ArrayBuffer');
              resolve(false);
              return;
            }

            this.logger.log('File loaded, parsing Excel...');
            const arrayBuffer = result;
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);

            let worksheet: ExcelJS.Worksheet | undefined =
              workbook.getWorksheet(1);
            if (!worksheet) {
              worksheet =
                workbook.worksheets.find(
                  (ws: ExcelJS.Worksheet) => ws.getRow(1)?.cellCount > 0,
                ) || workbook.worksheets[0];
            }

            columnNames = (
              worksheet!.getRow(1).values as (string | undefined)[]
            ).filter((value) => typeof value === 'string') as string[];
          }

          // Cache these columns for future validations
          this.fileColumnsCache[fileObj.id] = columnNames;
          this.logger.log('Cached columns for future use:', columnNames);

          const isValid = this.validateColumnsAgainstCategory(
            columnNames,
            targetItem,
            fileObj.file.name,
          );
          resolve(isValid);
        } catch (error) {
          this.logger.error('Error validating file columns:', error);
          this.toastr.error(
            this.transloco.translate('error_reading_file', {}, 'index'),
          );
          resolve(false);
        }
      };

      const fileName = (file?.name || '').toLowerCase();
      if (fileName.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  }

  private validateColumnsAgainstCategory(
    columnNames: string[],
    targetItem: {
      keyName: string;
      displayName: string;
      columnRequired: string[];
    },
    fileName: string,
  ): boolean {
    this.logger.log('validateColumnsAgainstCategory:', {
      fileName,
      targetDisplayName: targetItem.displayName,
      fileColumns: columnNames,
      requiredColumns: targetItem.columnRequired,
    });

    // Check if all required columns are present
    const missingColumns = targetItem.columnRequired.filter(
      (col) => !columnNames.includes(col),
    );

    this.logger.log('Missing columns:', missingColumns);

    if (missingColumns.length > 0) {
      // Show error modal with missing columns
      const validationError = `<strong>${this.transloco.translate(
        'file_for',
        {},
        'index',
      )} "${targetItem.displayName}" ${this.transloco.translate(
        'missing_columns_as_follows',
        {},
        'index',
      )}</strong><span>:</span> <br/><ul>${missingColumns
        .map((col) => `<li>${col}</li>`)
        .join('')}</ul>`;

      this.ui.showInvalidModal(
        `${this.transloco.translate(
          'column_name_mismatch_template',
          {},
          'index',
        )}`,
        [validationError],
      );
      this.logger.log('Validation FAILED - missing columns');
      return false; // Validation failed - missing columns
    } else {
      // All required columns are present
      this.logger.log('Validation PASSED - all columns present');
      return true; // Validation passed
    }
  }

  async validateUploadedFilesAgainstDepot() {
    const validFiles = [];
    for (const file of this.files.preOrderFiles) {
      const isValid = await this.validateFileAgainstDepotRequirements(file);
      if (isValid) {
        validFiles.push(file);
      } else {
        this.toastr.warning(
          `File ${file.file.name} does not match current depot requirements and has been removed.`,
        );
      }
    }
    this.files.preOrderFiles = validFiles;

    // Update upload button state after validation
    this.files.updateCanUploadState();
  }

  validateFileAgainstDepotRequirements(
    file: PreOrderFileItem,
  ): Promise<boolean> {
    // Read the file to get column names
    return new Promise<boolean>((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e: ProgressEvent<FileReader>) => {
        try {
          const result = e.target?.result;
          const fileName = (file.file?.name || '').toLowerCase();
          const isCsv = fileName.endsWith('.csv');

          let columnNames: string[] = [];
          if (isCsv) {
            if (typeof result !== 'string') {
              resolve(false);
              return;
            }
            columnNames = this.parseCsvHeaderColumnNames(result);
          } else {
            if (!(result instanceof ArrayBuffer)) {
              resolve(false);
              return;
            }
            const arrayBuffer = result;
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);

            let worksheet: ExcelJS.Worksheet | undefined =
              workbook.getWorksheet(1);
            if (!worksheet) {
              const normalize = (name: string) =>
                name
                  .trim()
                  .toLowerCase()
                  .replace(/[\s_-]/g, '');

              const allSheets = workbook.worksheets.map(
                (ws: ExcelJS.Worksheet) => ({
                  name: ws.name,
                  normalized: normalize(ws.name),
                }),
              );

              this.logger.log(
                'Detected sheets:',
                allSheets.map((sheet) => sheet.name),
              );

              worksheet =
                workbook.worksheets.find(
                  (ws: ExcelJS.Worksheet) => ws.getRow(1)?.cellCount > 0,
                ) || workbook.worksheets[0];
            }

            columnNames = (
              worksheet!.getRow(1).values as (string | undefined)[]
            ).filter((value) => typeof value === 'string') as string[];
          }

          // Check if file matches any of the depot's input data requirements
          const matchingInputDataItem =
            this.findMatchingInputDataItem(columnNames);
          if (matchingInputDataItem) {
            if (this.files.isFileWithCategory(file.file)) {
              file.file.keyName = matchingInputDataItem.keyName;
              file.file.displayName = matchingInputDataItem.displayName;
              file.file.isFirstOfType = false;
            }
            // Keep existing files editable when re-validating against depot
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (error) {
          this.logger.error('Error validating file:', error);
          resolve(false);
        }
      };
      if (this.files.isFileWithCategory(file.file)) {
        const fileName = (file.file?.name || '').toLowerCase();
        if (fileName.endsWith('.csv')) {
          reader.readAsText(file.file);
        } else {
          reader.readAsArrayBuffer(file.file);
        }
      } else {
        // For descriptor items (loaded from server), consider them valid
        resolve(true);
      }
    });
  }
}
