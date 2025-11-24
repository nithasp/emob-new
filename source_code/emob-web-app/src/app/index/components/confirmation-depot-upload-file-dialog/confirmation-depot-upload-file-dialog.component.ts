import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';
import { PreOrderFileItem } from 'src/app/models/pre-order.model';

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

  selectedRadioOption: 'yes' | 'no' | null = null;
  selectedCategory: string = '';

  constructor(
    private activeModal: NgbActiveModal,
    private toastr: ToastrService,
    private transloco: TranslocoService
  ) {}

  get categoryAlreadyExists(): boolean {
    return !!this.selectedCategory && this.preOrderFiles.some(
      (item) => item.file.displayName === this.selectedCategory
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

  onConfirm(): void {
    if (this.showCategorySelectOnly || this.selectedRadioOption === 'no') {
      this.activeModal.close({
        replace: false,
        category: this.selectedCategory,
      });
    } else if (this.selectedRadioOption === 'yes') {
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
