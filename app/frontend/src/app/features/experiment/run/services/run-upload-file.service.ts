import { Injectable, inject } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';
import { LoggerService } from '@core/services/logger.service';
import {
  DepotInputDataItem,
  FileWithCategory,
  PreOrderFileItem,
} from '../../models/pre-order.model';
import {
  ExperimentInputdata,
  Company,
  MyDepot,
  TransformWarning,
} from '../../models/experiment.model';
import { ExperimentService } from '../../services/experiment.service';
import { RunStateService } from './run-state.service';
import { RunParameterService } from './run-parameter.service';
import { deduplicateByInput } from '../utils/validation-table.utils';

@Injectable()
export class RunUploadFileService {
  private readonly logger = inject(LoggerService);

  public requiredFileType: string = '.xlsx, .xls';
  readonly validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];
  private readonly extensionMimeMap: Record<string, string[]> = {
    '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    '.xls': ['application/vnd.ms-excel', 'application/octet-stream'],
    '.csv': ['text/csv', 'application/csv', 'application/vnd.ms-excel'],
  };
  depotInputDataItems: DepotInputDataItem[] = [];
  public preOrderFiles: PreOrderFileItem[] = [];
  public inputDataKeys: string[] = [];
  public canUpload: boolean = false;
  transformWarnings: TransformWarning[] = [];
  transformWarningCollapseStates: boolean[] = [];

  constructor(
    private readonly spinner: NgxSpinnerService,
    private readonly experimentService: ExperimentService,
    private readonly toastr: ToastrService,
    private readonly transloco: TranslocoService,
    private readonly state: RunStateService,
    private readonly params: RunParameterService,
  ) {}

  get requiredFileTypes(): string[] {
    return this.depotInputDataItems.map((item) => item.displayName);
  }

  private normalizeFileExtension(fileFormatType?: string | null): string {
    const raw = (fileFormatType || '').trim().toLowerCase();
    if (!raw) return '';
    return raw.startsWith('.') ? raw : `.${raw}`;
  }

  private getAllowedFileExtensionsFromDepot(depot?: MyDepot): string[] {
    if (!depot?.inputdata?.length) {
      return ['.xlsx', '.xls'];
    }

    const prioritized: string[] = [];
    for (const inputItem of depot.inputdata) {
      const extension = this.normalizeFileExtension(inputItem.fileFormatType);
      if (!extension) continue;

      const candidates =
        extension === '.xlsx'
          ? ['.xlsx', '.xls']
          : extension === '.xls'
            ? ['.xls', '.xlsx']
            : [extension];

      for (const candidate of candidates) {
        if (!prioritized.includes(candidate)) {
          prioritized.push(candidate);
        }
      }
    }

    return prioritized.length ? prioritized : ['.xlsx', '.xls'];
  }

  private getRequiredFileTypeDisplay(extensions: string[]): string {
    return extensions.join(', ');
  }

  updateRequiredFileTypeByDepot(depot?: MyDepot): void {
    const allowedExtensions = this.getAllowedFileExtensionsFromDepot(depot);
    this.requiredFileType = this.getRequiredFileTypeDisplay(allowedExtensions);
  }

  isFileMatchingRequiredType(file: File): boolean {
    const selectedDepot = this.state.getSelectedDepotObject();
    const allowedExtensions = this.getAllowedFileExtensionsFromDepot(selectedDepot);
    const normalizedFileName = (file.name || '').toLowerCase();
    const fileExtension =
      normalizedFileName.lastIndexOf('.') >= 0
        ? normalizedFileName.slice(normalizedFileName.lastIndexOf('.'))
        : '';
    const normalizedMimeType = (file.type || '').toLowerCase();

    return allowedExtensions.some((extension) => {
      if (fileExtension === extension) {
        return true;
      }
      const allowedMimeTypes = this.extensionMimeMap[extension] || [];
      return !!normalizedMimeType && allowedMimeTypes.includes(normalizedMimeType);
    });
  }

  isFileTypeRequired(displayName: string): boolean {
    return (
      this.depotInputDataItems.find((item) => item.displayName === displayName)
        ?.required ?? false
    );
  }

  isFileTypeAlreadyAdded(displayName: string): boolean {
    return this.preOrderFiles.some(
      (fileItem) => fileItem.file.displayName === displayName,
    );
  }

  getMyDepots(showSpinner: boolean = false) {
    if (showSpinner) {
      this.spinner.show();
    }

    this.experimentService.getMyCompany().subscribe({
      next: (company: Company) => {
        this.state.companyDepotType = company.depotType;
      },
      error: (error) => {
        this.logger.error('Error fetching myCompany data:', error);
        this.toastr.error(error);
      },
    });

    this.experimentService.getMyDepots().subscribe({
      next: (depots: MyDepot[]) => {
        // Normalize depot structure for compatibility (moved from service)
        this.state.depots = (depots || []).map((depot: MyDepot) => ({
          ...depot,
          depotName: depot.depotName,
          latitude: Number(depot.latitude),
          longitude: Number(depot.longitude),
          columns: depot.columns || [],
          inputdata: depot.inputdata || [],
        }));
        if (this.state.depots && this.state.depots.length > 0) {
          this.state.selectedDepotIdName = this.state.depots[0].depotName;

          // Update input data keys from the first depot
          this.updateInputDataKeysFromDepot(this.state.depots[0]);
          this.updateRequiredFileTypeByDepot(this.state.depots[0]);
          // refresh dynamic parameters view for selected depot
          this.params.refreshDynamicParametersForSelectedDepot();

          if (this.state.selectedDepotIdName) {
            localStorage.setItem(
              'selectedDepotIdName',
              this.state.selectedDepotIdName,
            );
          }

          // Initialize upload button state
          this.updateCanUploadState();
        }
      },
      error: (error) => {
        this.logger.error('Error fetching myDepots data:', error);
        this.toastr.error(error);
        if (showSpinner) {
          this.spinner.hide();
        }
      },
      complete: () => {
        if (showSpinner) {
          this.spinner.hide();
        }
      },
    });
  }

  updateInputDataKeysFromDepot(depot: MyDepot) {
    this.depotInputDataItems =
      depot.inputdata?.map((item) => ({
        keyName: item.keyName,
        displayName: item.displayName,
        columnRequired: item.columnRequired || [],
        required: item.required,
        fileFormatType: item.fileFormatType,
      })) || [];

    const uniqueItems = this.depotInputDataItems.filter(
      (item, index, self) =>
        index ===
        self.findIndex((existingItem) => existingItem.keyName === item.keyName),
    );
    this.inputDataKeys = uniqueItems.map((item) => item.displayName);

    // Update upload button state when depot requirements change
    this.updateCanUploadState();
  }

  updateCanUploadState(): void {
    if (this.preOrderFiles.length === 0) {
      this.canUpload = false;
      return;
    }

    // Check for duplicate categories
    if (this.hasAnyDuplicateCategories()) {
      this.canUpload = false;
      return;
    }

    // Note: Duplicate file names and file sizes only show warnings but don't disable submit

    // Get only required file types (where required === true)
    const requiredDisplayNames = this.depotInputDataItems
      .filter((item) => item.required === true)
      .map((item) => item.displayName);

    const uploadedDisplayNames = this.preOrderFiles
      .map(
        (preOrderFileItem) =>
          (preOrderFileItem.file as FileWithCategory).displayName,
      )
      .filter((displayName) => !!displayName);

    // Check if all required files are uploaded
    // If no files are required, every() returns true (allowing optional-only uploads)
    const allRequiredUploaded = requiredDisplayNames.every((required) =>
      uploadedDisplayNames.includes(required),
    );

    this.canUpload = allRequiredUploaded;
  }

  isFileWithCategory(
    value: File | (Partial<FileWithCategory> & object) | null | undefined,
  ): value is FileWithCategory {
    return (
      !!value &&
      typeof value === 'object' &&
      ('arrayBuffer' in (value as File) || value instanceof File)
    );
  }

  hasDuplicateCategory(fileObj: PreOrderFileItem): boolean {
    if (!fileObj.file.displayName) return false;

    // Count how many files have the same displayName
    const count = this.preOrderFiles.filter(
      (item) => item.file.displayName === fileObj.file.displayName,
    ).length;

    // If count > 1, this category is duplicated
    return count > 1;
  }

  hasAnyDuplicateCategories(): boolean {
    // Check if any file in preOrderFiles has a duplicate category
    return this.preOrderFiles.some((fileObj) =>
      this.hasDuplicateCategory(fileObj),
    );
  }

  hasDuplicateFileName(fileObj: PreOrderFileItem): boolean {
    if (!fileObj.file.name) return false;

    // Count how many files have the same file name
    const count = this.preOrderFiles.filter(
      (item) => item.file.name === fileObj.file.name,
    ).length;

    // If count > 1, this file name is duplicated
    return count > 1;
  }

  hasDuplicateFileSize(fileObj: PreOrderFileItem): boolean {
    if (!fileObj.file.size) return false;

    // Only check for duplicate file size if file name is also duplicated
    if (!this.hasDuplicateFileName(fileObj)) return false;

    // Count how many files have the same file size AND same file name
    const count = this.preOrderFiles.filter(
      (item) =>
        item.file.size === fileObj.file.size &&
        item.file.name === fileObj.file.name,
    ).length;

    // If count > 1, this file size is duplicated (with matching name)
    return count > 1;
  }

  hasFileWarning(fileObj: PreOrderFileItem): boolean {
    return (
      this.hasDuplicateFileName(fileObj) || this.hasDuplicateFileSize(fileObj)
    );
  }

  getFileWarningMessages(fileObj: PreOrderFileItem): string[] {
    const messages: string[] = [];

    // Check duplicate file name first
    if (this.hasDuplicateFileName(fileObj)) {
      messages.push(
        this.transloco.translate('duplicate_file_name', {}, 'index'),
      );

      // Only check duplicate file size if file name is also duplicated
      if (this.hasDuplicateFileSize(fileObj)) {
        messages.push(
          this.transloco.translate('duplicate_file_size', {}, 'index'),
        );
      }
    }

    return messages;
  }

  getAllErrorMessages(fileObj: PreOrderFileItem): string {
    const messages: string[] = [];

    // Add file warning messages if any (WARNING - displayed first)
    if (this.hasFileWarning(fileObj)) {
      const warningMessages = this.getFileWarningMessages(fileObj);
      messages.push(...warningMessages);
    }

    // Add duplicate category message if applicable (ERROR - displayed after warnings)
    if (this.hasDuplicateCategory(fileObj)) {
      messages.push(
        this.transloco.translate(
          'a_file_with_this_category_is_already_added',
          {},
          'index',
        ),
      );
    }

    return messages.join(', ');
  }

  getFileTypeDisplay(fileObj: PreOrderFileItem): string {
    // Derive from the extension: a .csv on Windows may report the Excel MIME
    // type ('application/vnd.ms-excel'), so the MIME type alone is unreliable.
    const fileName = (fileObj.file?.name || '').toLowerCase();
    const dotIndex = fileName.lastIndexOf('.');
    if (dotIndex > -1) {
      return fileName.slice(dotIndex + 1);
    }
    return this.validTypes.includes(fileObj.file?.type)
      ? 'xlsx'
      : fileObj.file?.type || '';
  }

  setTransformWarnings(warnings: TransformWarning[]) {
    this.transformWarnings = warnings.map((warning) => ({
      ...warning,
      detail: deduplicateByInput(warning.detail),
    }));
    this.transformWarningCollapseStates = this.transformWarnings.map(
      () => true,
    );
  }

  toggleTransformWarningCollapse(index: number) {
    this.transformWarningCollapseStates[index] =
      !this.transformWarningCollapseStates[index];
  }

  getWarningTitle(title: string): string {
    const titleMap: Record<string, string> = {
      products: this.transloco.translate('product_missing', {}, 'index'),
    };
    return titleMap[title] || title;
  }

  showExperimentFiles(inputdata: ExperimentInputdata[] | undefined): void {
    this.preOrderFiles = (inputdata || []).map(
      (inputItem: ExperimentInputdata) => {
        const mockFile = {
          keyName: inputItem.keyName,
          name: inputItem.filename,
          blobPath: inputItem.blobPath,
          displayName: inputItem.displayName,
          type: inputItem.fileFormatType,
          size: inputItem.fileSize,
        };

        return {
          id: this.state.generateUniqueId(),
          file: mockFile,
        };
      },
    );
  }
}
