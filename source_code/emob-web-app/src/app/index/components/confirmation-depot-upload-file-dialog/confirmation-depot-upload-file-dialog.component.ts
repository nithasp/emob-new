import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';
import {
  CategoryValidationResult,
  DepotInputDataItem,
  PreOrderFileItem,
} from 'src/app/models/pre-order.model';

@Component({
  selector: 'app-confirmation-depot-upload-file-dialog',
  templateUrl: './confirmation-depot-upload-file-dialog.component.html',
  styleUrls: ['./confirmation-depot-upload-file-dialog.component.scss'],
})
export class ConfirmationDepotUploadFileDialogComponent {
  @Input() title: string = 'Confirm Action';
  @Input() message?: string;
  @Input() question?: string;
  @Input() acceptButton: string = 'Confirm';
  @Input() disableCancelButton: boolean = false;
  @Input() showRadioOptions: boolean = false;
  @Input() showCategorySelectOnly: boolean = false;
  @Input() inputDataKeys: string[] = [];
  @Input() preOrderFiles: PreOrderFileItem[] = [];
  @Input() depotInputDataItems: DepotInputDataItem[] = [];
  @Input() fileColumns: string[] = [];

  selectedRadioOption: 'yes' | 'no' | null = null;
  selectedCategory: string = '';

  constructor(
    private activeModal: NgbActiveModal,
    private toastr: ToastrService,
    private transloco: TranslocoService
  ) {}

  get categoryAlreadyExists(): boolean {
    return (
      !!this.selectedCategory &&
      this.preOrderFiles.some(
        (item) => item.file.displayName === this.selectedCategory
      )
    );
  }

  get showCategorySelect(): boolean {
    return this.showCategorySelectOnly || this.selectedRadioOption === 'no';
  }

  get isConfirmDisabled(): boolean {
    if (this.showCategorySelectOnly) {
      return !this.selectedCategory || this.categoryAlreadyExists;
    }
    if (!this.showRadioOptions) return false;
    if (this.selectedRadioOption === 'yes') return false;
    return this.selectedRadioOption !== 'no' || !this.selectedCategory;
  }

  onCancel(): void {
    this.activeModal.close(false);
  }

  validateCategoryColumns(): CategoryValidationResult {
    if (!this.selectedCategory) {
      return { isValid: false, missingColumns: [] };
    }

    const targetItem = this.depotInputDataItems.find(
      (item) => item.displayName === this.selectedCategory
    );

    if (!targetItem) {
      // If no matching item found, skip validation (backwards compatibility)
      console.log(
        'No matching depotInputDataItem found for category:',
        this.selectedCategory
      );
      return { isValid: true, missingColumns: [] };
    }

    // If no file columns provided, skip validation (backwards compatibility)
    if (!this.fileColumns || this.fileColumns.length === 0) {
      console.log('No file columns provided, skipping validation');
      return { isValid: true, missingColumns: [] };
    }

    const missingColumns = targetItem.columnRequired.filter(
      (col) => !this.fileColumns.includes(col)
    );

    console.log('Category validation:', {
      selectedCategory: this.selectedCategory,
      requiredColumns: targetItem.columnRequired,
      fileColumns: this.fileColumns,
      missingColumns,
    });

    return {
      isValid: missingColumns.length === 0,
      missingColumns,
      targetDisplayName: targetItem.displayName,
    };
  }

  onConfirm(): void {
    console.log('onConfirm');
    if (this.showCategorySelectOnly || this.selectedRadioOption === 'no') {
      console.log('onConfirm1 - validating category columns');
      console.log('selectedCategory', this.selectedCategory);

      // Validate columns for the selected category
      const validation = this.validateCategoryColumns();

      if (!validation.isValid && validation.missingColumns.length > 0) {
        // Return validation failure result to parent component
        console.log(
          'Validation FAILED - missing columns:',
          validation.missingColumns
        );
        this.activeModal.close({
          replace: false,
          category: this.selectedCategory,
          validationFailed: true,
          missingColumns: validation.missingColumns,
          targetDisplayName: validation.targetDisplayName,
        });
        return;
      }

      // Validation passed - proceed normally
      console.log('Validation PASSED');
      this.activeModal.close({
        replace: false,
        category: this.selectedCategory,
      });
    } else if (this.selectedRadioOption === 'yes') {
      console.log('onConfirm2');
      this.activeModal.close({ replace: true });
    }
  }

  onRadioChange(value: 'yes' | 'no'): void {
    this.selectedRadioOption = value;
    if (value === 'yes') {
      this.selectedCategory = '';
    }
  }

  onCategoryChange(): void {
    if (this.categoryAlreadyExists) {
      this.toastr.warning(
        this.transloco.translate(
          'a_file_with_this_category_is_already_added',
          {},
          'index'
        )
      );
    }
  }

  log(message: string = ''): void {
    console.log('inputDataKeys', this.inputDataKeys);
    console.log('depotInputDataItems', this.depotInputDataItems);
    console.log('fileColumns', this.fileColumns);
    console.log('selectedCategory', this.selectedCategory);
  }
}
