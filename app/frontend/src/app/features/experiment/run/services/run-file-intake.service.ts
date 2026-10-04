import { Injectable, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';
import { LoggerService } from '@core/services/logger.service';
import {
  FileWithCategory,
  PreOrderFileDescriptor,
  PreOrderFileItem,
} from '../../models/pre-order.model';
import { DialogConfirmationDepotUploadFileComponent } from '../dialogs/dialog-confirmation-depot-upload-file/dialog-confirmation-depot-upload-file.component';
import { RunStateService } from './run-state.service';
import { RunUiService } from './run-ui.service';
import { RunUploadFileService } from './run-upload-file.service';
import { RunFileColumnService } from './run-file-column.service';

@Injectable()
export class RunFileIntakeService {
  private readonly logger = inject(LoggerService);

  private fileDisplayNameBeforeChange: { [fileId: string]: string } = {};

  constructor(
    private readonly ngbModal: NgbModal,
    private readonly toastr: ToastrService,
    private readonly transloco: TranslocoService,
    private readonly state: RunStateService,
    private readonly ui: RunUiService,
    private readonly files: RunUploadFileService,
    private readonly fileColumns: RunFileColumnService,
  ) {}

  async uploadFile(file: FileWithCategory) {
    const id = this.state.generateUniqueId();

    // Check for duplicate file size and name before proceeding
    const warningMessages: string[] = [];

    const hasDuplicateFileName = this.files.preOrderFiles.some(
      (existingFile) => existingFile.file.name === file.name,
    );
    if (hasDuplicateFileName) {
      warningMessages.push(
        this.transloco.translate('duplicate_file_name', {}, 'index'),
      );

      const hasDuplicateFileSize = this.files.preOrderFiles.some(
        (existingFile) =>
          existingFile.file.name === file.name &&
          existingFile.file.size === file.size,
      );
      if (hasDuplicateFileSize) {
        warningMessages.push(
          this.transloco.translate('duplicate_file_size', {}, 'index'),
        );
      }
    }

    const { isValid, keyName, displayName, columnNames } =
      await this.fileColumns.validateSingleFileAgainstDepot(file, id);

    if (!isValid || !keyName || !displayName) return;

    if (columnNames) {
      this.fileColumns.fileColumnsCache[id] = columnNames;
      this.logger.log('Columns cached for file:', id, columnNames);
    }

    // Find the matched item for the new file
    const matchedItem = this.files.depotInputDataItems.find(
      (item) => item.keyName === keyName,
    );

    // Find if a file of this type already exists (by keyName)
    const index = this.files.preOrderFiles.findIndex(
      (f) => f.file.keyName === keyName,
    );

    // Also check if any existing file has the same columnRequired
    const existingFileWithSameColumns = matchedItem
      ? this.files.preOrderFiles.find((fileItem) => {
          const existingKeyName = this.files.isFileWithCategory(fileItem.file)
            ? fileItem.file.keyName
            : (fileItem.file as PreOrderFileDescriptor).keyName;
          const existingItem = this.files.depotInputDataItems.find(
            (item) => item.keyName === existingKeyName,
          );
          if (!existingItem) return false;
          return (
            existingItem.columnRequired.length ===
              matchedItem.columnRequired.length &&
            existingItem.columnRequired.every((col) =>
              matchedItem.columnRequired.includes(col),
            )
          );
        })
      : undefined;

    if (index !== -1 || existingFileWithSameColumns) {
      // duplicate file logic here (either same keyName OR same columnRequired)

      // Determine which file is being duplicated
      const duplicatedFileIndex =
        index !== -1
          ? index
          : this.files.preOrderFiles.findIndex(
              (f) => f.id === existingFileWithSameColumns?.id,
            );
      const currentDisplayName =
        duplicatedFileIndex !== -1
          ? this.files.preOrderFiles[duplicatedFileIndex].file.displayName
          : displayName;

      // Show confirmation dialog before replacing
      const focusedElement = document.activeElement as HTMLElement;
      if (focusedElement) {
        focusedElement.blur();
      }
      const dialogRef = this.ngbModal.open(
        DialogConfirmationDepotUploadFileComponent,
        {
          centered: true,
          animation: true,
        },
      );
      dialogRef.componentInstance.title = this.transloco.translate(
        'replace_data_confirmation',
        {},
        'index',
      );
      dialogRef.componentInstance.question = `${this.transloco.translate(
        'want_to_replace_data_type',
        {},
        'index',
      )} ${currentDisplayName} ${this.transloco.translate(
        'with_the_new_data',
        {},
        'index',
      )}?`;
      dialogRef.componentInstance.message = '';
      dialogRef.componentInstance.acceptButton = this.transloco.translate(
        'confirm',
        {},
        'index',
      );
      dialogRef.componentInstance.disableCancelButton = false;
      dialogRef.componentInstance.showRadioOptions = true;
      dialogRef.componentInstance.inputDataKeys = this.files.inputDataKeys;
      dialogRef.componentInstance.preOrderFiles = this.files.preOrderFiles;
      // Pass data for column validation
      dialogRef.componentInstance.depotInputDataItems =
        this.files.depotInputDataItems;
      dialogRef.componentInstance.fileColumns = columnNames || [];

      dialogRef.result
        .then(
          (
            result:
              | {
                  replace: boolean;
                  category?: string;
                  validationFailed?: boolean;
                  missingColumns?: string[];
                  targetDisplayName?: string;
                }
              | boolean,
          ) => {
            // Handle both old boolean format and new object format for backwards compatibility
            if (typeof result === 'boolean') {
              if (result && duplicatedFileIndex !== -1) {
                file.keyName = keyName;
                file.displayName = displayName;
                file.isFirstOfType = true;
                this.files.preOrderFiles[duplicatedFileIndex] = { id, file };
                this.state.isFilePreview = true;
                this.files.updateCanUploadState();
              }
            } else if (result && typeof result === 'object') {
              // Check if validation failed - show invalid modal and don't add file
              if (
                result.validationFailed &&
                result.missingColumns &&
                result.missingColumns.length > 0
              ) {
                const validationError = `<strong>${this.transloco.translate(
                  'file_for',
                  {},
                  'index',
                )} "${
                  result.targetDisplayName || result.category
                }" ${this.transloco.translate(
                  'missing_columns_as_follows',
                  {},
                  'index',
                )}</strong><span>:</span> <br/><ul>${result.missingColumns
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
                this.logger.log('Validation FAILED from dialog - missing columns');
                return; // Don't add the file
              }

              if (result.replace && duplicatedFileIndex !== -1) {
                // Replace existing file
                file.keyName = keyName;
                file.displayName = displayName;
                file.isFirstOfType = true;
                this.files.preOrderFiles[duplicatedFileIndex] = { id, file };
                this.state.isFilePreview = true;
                this.files.updateCanUploadState();
              } else if (result.category) {
                // Add as new file with selected category
                const selectedItem = this.files.depotInputDataItems.find(
                  (item) => item.displayName === result.category,
                );
                if (selectedItem) {
                  file.keyName = selectedItem.keyName;
                  file.displayName = selectedItem.displayName;
                  file.isFirstOfType = true;
                  this.files.preOrderFiles.push({ id, file });
                  this.state.isFilePreview = true;
                  this.files.updateCanUploadState();
                }
              }
            }
          },
        )
        .catch(() => {
          // Dialog dismissed
        });
    } else {
      // no duplicate file logic here
      // Check if columnRequired is duplicated AND none of the duplicate files are in preOrderFiles yet
      // Find the matched item for the current file
      const matchedItemForNew = this.files.depotInputDataItems.find(
        (item) => item.keyName === keyName,
      );

      if (matchedItemForNew) {
        // Check if there are other items with the same columnRequired
        const itemsWithSameColumns = this.files.depotInputDataItems.filter((item) => {
          return (
            item.columnRequired.length ===
              matchedItemForNew.columnRequired.length &&
            item.columnRequired.every((col) =>
              matchedItemForNew.columnRequired.includes(col),
            )
          );
        });

        if (itemsWithSameColumns.length > 1) {
          // Duplicate columnRequired found - now check if ANY of them are already in preOrderFiles
          const anyDuplicateInPreOrderFiles = itemsWithSameColumns.some(
            (item) => {
              return this.files.preOrderFiles.some((fileItem) => {
                const existingKeyName = this.files.isFileWithCategory(fileItem.file)
                  ? fileItem.file.keyName
                  : (fileItem.file as PreOrderFileDescriptor).keyName;
                return existingKeyName === item.keyName;
              });
            },
          );

          if (!anyDuplicateInPreOrderFiles) {
            // None of the duplicate columnRequired files are in preOrderFiles yet - show dialog
            const focusedElement = document.activeElement as HTMLElement;
            if (focusedElement) {
              focusedElement.blur();
            }
            const dialogRef = this.ngbModal.open(
              DialogConfirmationDepotUploadFileComponent,
              {
                centered: true,
                animation: true,
              },
            );
            dialogRef.componentInstance.title = this.transloco.translate(
              'select_category',
              {},
              'index',
            );
            dialogRef.componentInstance.showRadioOptions = false;
            dialogRef.componentInstance.showCategorySelectOnly = true;
            dialogRef.componentInstance.inputDataKeys =
              itemsWithSameColumns.map((item) => item.displayName);
            dialogRef.componentInstance.preOrderFiles = this.files.preOrderFiles;
            // Pass data for column validation
            dialogRef.componentInstance.depotInputDataItems =
              this.files.depotInputDataItems;
            dialogRef.componentInstance.fileColumns = columnNames || [];

            dialogRef.result
              .then(
                (
                  result:
                    | {
                        category?: string;
                        validationFailed?: boolean;
                        missingColumns?: string[];
                        targetDisplayName?: string;
                      }
                    | boolean,
                ) => {
                  if (result && typeof result === 'object') {
                    // Check if validation failed - show invalid modal and don't add file
                    if (
                      result.validationFailed &&
                      result.missingColumns &&
                      result.missingColumns.length > 0
                    ) {
                      const validationError = `<strong>${this.transloco.translate(
                        'file_for',
                        {},
                        'index',
                      )} "${
                        result.targetDisplayName || result.category
                      }" ${this.transloco.translate(
                        'missing_columns_as_follows',
                        {},
                        'index',
                      )}</strong><span>:</span> <br/><ul>${result.missingColumns
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
                      this.logger.log(
                        'Validation FAILED from dialog - missing columns',
                      );
                      return; // Don't add the file
                    }

                    if (result.category) {
                      const selectedItem = this.files.depotInputDataItems.find(
                        (item) => item.displayName === result.category,
                      );
                      if (selectedItem) {
                        file.keyName = selectedItem.keyName;
                        file.displayName = selectedItem.displayName;
                        file.isFirstOfType = true;
                        this.files.preOrderFiles.push({ id, file });
                        this.state.isFilePreview = true;
                        this.files.updateCanUploadState();
                      }
                    }
                  }
                },
              )
              .catch(() => {
                // Dialog dismissed
              });
            return; // Exit early to prevent default behavior
          }
        }
      }

      // Default behavior: no duplicate columnRequired OR at least one duplicate is already in preOrderFiles
      // Just add the file normally
      file.keyName = keyName;
      file.displayName = displayName;
      file.isFirstOfType = true;
      this.files.preOrderFiles.push({ id, file });
      this.state.isFilePreview = true;
    }

    // Update upload button state after file changes
    this.files.updateCanUploadState();
  }

  onCategoryDropdownOpened(fileObj: PreOrderFileItem, isOpened: boolean): void {
    this.logger.log('=== onCategoryDropdownOpened ===', {
      isOpened,
      fileId: fileObj.id,
      fileName: fileObj.file.name,
    });

    if (isOpened) {
      // Capture current displayName before user makes a selection
      const currentDisplayName = this.files.isFileWithCategory(fileObj.file)
        ? fileObj.file.displayName || ''
        : (fileObj.file as PreOrderFileDescriptor).displayName || '';
      this.fileDisplayNameBeforeChange[fileObj.id] = currentDisplayName;

      this.logger.log('Captured current displayName:', currentDisplayName);
      this.logger.log('All tracked values:', this.fileDisplayNameBeforeChange);
    }
  }

  async handleInputDataKeyChange(
    fileObj: PreOrderFileItem,
    event: { value: string },
  ) {
    this.logger.log('=== handleInputDataKeyChange START ===');
    this.logger.log('Event value:', event.value);
    this.logger.log('File object:', {
      id: fileObj.id,
      currentDisplayName: fileObj.file.displayName,
      fileName: fileObj.file.name,
      isFile: this.files.isFileWithCategory(fileObj.file),
    });

    const selectedDisplayName = event.value;

    // Get the previous displayName from our tracked object
    const previousDisplayName =
      this.fileDisplayNameBeforeChange[fileObj.id] || '';

    this.logger.log('Previous displayName from tracking:', previousDisplayName);

    if (selectedDisplayName) {
      // First: Validate if file columns match the new category requirements
      this.logger.log('Starting column validation...');
      const isValid = await this.fileColumns.validateFileColumnsForCategory(
        fileObj,
        selectedDisplayName,
      );
      this.logger.log('Validation result:', isValid);

      if (!isValid) {
        // Validation failed, modal already shown, revert to previous value
        this.logger.log('Validation failed, reverting...');
        this.revertFileDisplayName(fileObj, previousDisplayName);
        this.logger.log('=== handleInputDataKeyChange END (validation failed) ===');
        return;
      }

      // Second: Check if this category already exists in other files (for warning only)
      const isDuplicate = this.files.preOrderFiles.some(
        (item) =>
          item.id !== fileObj.id &&
          item.file.displayName === selectedDisplayName,
      );

      if (isDuplicate) {
        this.logger.log(
          'Category already exists in another file, showing warning...',
        );
        // Show warning toast but allow the change
        // hasDuplicateCategory will show red border (2px solid #dc3545)
        this.toastr.warning(
          this.transloco.translate(
            'a_file_with_this_category_is_already_added',
            {},
            'index',
          ),
        );
      }
    }

    this.logger.log('Validation passed, updating file properties...');
    const found = this.files.depotInputDataItems.find(
      (item) => item.displayName === selectedDisplayName,
    );

    if (found) {
      this.logger.log('Found matching depot item:', found.keyName);
      if (this.files.isFileWithCategory(fileObj.file)) {
        fileObj.file.keyName = found.keyName;
        fileObj.file.displayName = found.displayName;
      } else {
        (fileObj.file as PreOrderFileDescriptor).keyName = found.keyName;
        (fileObj.file as PreOrderFileDescriptor).displayName =
          found.displayName;
      }
    } else {
      this.logger.log('No matching depot item found, clearing values');
      if (this.files.isFileWithCategory(fileObj.file)) {
        fileObj.file.keyName = '';
        fileObj.file.displayName = '';
      } else {
        (fileObj.file as PreOrderFileDescriptor).keyName = '';
        (fileObj.file as PreOrderFileDescriptor).displayName = '';
      }
    }

    // Update our tracked object with the new confirmed value
    this.fileDisplayNameBeforeChange[fileObj.id] = selectedDisplayName;
    this.logger.log('Updated tracking with new value:', selectedDisplayName);

    // Update upload button state after category change
    this.files.updateCanUploadState();
    this.logger.log('=== handleInputDataKeyChange END (success) ===');
  }

  revertFileDisplayName(
    fileObj: PreOrderFileItem,
    previousDisplayName: string,
  ): void {
    this.logger.log('Reverting file displayName', {
      fileId: fileObj.id,
      currentDisplayName: fileObj.file.displayName,
      previousDisplayName,
    });

    const previousItem = this.files.depotInputDataItems.find(
      (item) => item.displayName === previousDisplayName,
    );

    if (this.files.isFileWithCategory(fileObj.file)) {
      fileObj.file.displayName = previousDisplayName;
      if (previousItem) {
        fileObj.file.keyName = previousItem.keyName;
      } else {
        fileObj.file.keyName = '';
      }
    } else {
      (fileObj.file as PreOrderFileDescriptor).displayName =
        previousDisplayName;
      if (previousItem) {
        (fileObj.file as PreOrderFileDescriptor).keyName = previousItem.keyName;
      } else {
        (fileObj.file as PreOrderFileDescriptor).keyName = '';
      }
    }

    // Force update the specific file in the array to trigger change detection
    const index = this.files.preOrderFiles.findIndex((f) => f.id === fileObj.id);
    if (index !== -1) {
      this.files.preOrderFiles[index] = { ...fileObj };
    }

    // Trigger change detection to update the UI
    this.ui.detectChanges();

    this.logger.log('File reverted successfully', {
      newDisplayName: fileObj.file.displayName,
      newKeyName: this.files.isFileWithCategory(fileObj.file)
        ? fileObj.file.keyName
        : (fileObj.file as PreOrderFileDescriptor).keyName,
    });
  }
}
