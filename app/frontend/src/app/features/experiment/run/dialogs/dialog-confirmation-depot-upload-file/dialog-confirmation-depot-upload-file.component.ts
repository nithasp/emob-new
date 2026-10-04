import { Component, Input, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';
import {
  CategoryValidationResult,
  DepotInputDataItem,
  PreOrderFileItem,
} from '../../../models/pre-order.model';
import { LoggerService } from '@core/services/logger.service';

@Component({
  selector: 'app-dialog-confirmation-depot-upload-file',
  templateUrl: './dialog-confirmation-depot-upload-file.component.html',
  styleUrls: ['./dialog-confirmation-depot-upload-file.component.scss'],
})
export class DialogConfirmationDepotUploadFileComponent {
  private readonly logger = inject(LoggerService);

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
      this.logger.log(
        'No matching depotInputDataItem found for category:',
        this.selectedCategory
      );
      return { isValid: true, missingColumns: [] };
    }

    if (!this.fileColumns || this.fileColumns.length === 0) {
      return { isValid: true, missingColumns: [] };
    }

    const missingColumns = targetItem.columnRequired.filter(
      (col) => !this.fileColumns.includes(col)
    );

    this.logger.log('Category validation:', {
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
    this.logger.log('onConfirm');
    if (this.showCategorySelectOnly || this.selectedRadioOption === 'no') {
      this.logger.log('onConfirm1 - validating category columns');
      this.logger.log('selectedCategory', this.selectedCategory);

      const validation = this.validateCategoryColumns();

      if (!validation.isValid && validation.missingColumns.length > 0) {
        this.activeModal.close({
          replace: false,
          category: this.selectedCategory,
          validationFailed: true,
          missingColumns: validation.missingColumns,
          targetDisplayName: validation.targetDisplayName,
        });
        return;
      }

      this.activeModal.close({
        replace: false,
        category: this.selectedCategory,
      });
    } else if (this.selectedRadioOption === 'yes') {
      this.logger.log('onConfirm2');
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
}
