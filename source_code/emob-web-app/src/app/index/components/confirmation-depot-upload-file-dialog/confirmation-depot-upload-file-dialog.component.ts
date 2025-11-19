import { Component, OnInit, Inject, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-confirmation-depot-upload-file-dialog',
  templateUrl: './confirmation-depot-upload-file-dialog.component.html',
  styleUrls: ['./confirmation-depot-upload-file-dialog.component.scss'],
})
export class ConfirmationDepotUploadFileDialogComponent implements OnInit {
  @Input() title: string = 'Confirm Action';
  @Input() message?: string;
  @Input() question?: string;
  @Input() acceptButton: string = 'Confirm';
  @Input() disableCancelButton: boolean = false;
  @Input() showRadioOptions: boolean = false;
  @Input() showCategorySelectOnly: boolean = false;
  @Input() inputDataKeys: string[] = [];
  @Input() preOrderFiles: any[] = [];

  selectedRadioOption: string | null = null;
  selectedCategory: string = '';
  categoryAlreadyExists: boolean = false;

  constructor(
    private activeModal: NgbActiveModal,
    private toastr: ToastrService,
    private transloco: TranslocoService
  ) {}
  ngOnInit() {}
  onCancleClick() {
    this.activeModal.close(false);
  }
  onConfirmClick(): void {
    if (this.showCategorySelectOnly) {
      // For columnRequired duplicate case, only return category
      if (this.selectedCategory) {
        this.activeModal.close({ category: this.selectedCategory });
      }
    } else if (this.selectedRadioOption === 'yes') {
      this.activeModal.close({ replace: true });
    } else if (this.selectedRadioOption === 'no' && this.selectedCategory) {
      this.activeModal.close({
        replace: false,
        category: this.selectedCategory,
      });
    }
  }
  onRadioChange(value: string): void {
    this.selectedRadioOption = value;
    // Reset category selection when switching radio options
    if (value === 'yes') {
      this.selectedCategory = '';
      this.categoryAlreadyExists = false;
    }
  }
  onCategoryChange(displayName: string): void {
    this.selectedCategory = displayName;

    if (displayName) {
      // Check if this category already exists in preOrderFiles
      const exists = this.preOrderFiles.some(
        (item) => item.file.displayName === displayName
      );

      this.categoryAlreadyExists = exists;

      if (exists) {
        this.toastr.warning(
          this.transloco.translate(
            'a_file_with_this_category_is_already_added',
            {},
            'index'
          )
        );
      }
    } else {
      this.categoryAlreadyExists = false;
    }
  }
  isConfirmDisabled(): boolean {
    if (this.showCategorySelectOnly) {
      // For columnRequired duplicate case, only check if category is selected
      return !this.selectedCategory || this.categoryAlreadyExists;
    }

    if (!this.showRadioOptions) {
      return false;
    }

    if (this.selectedRadioOption === 'yes') {
      return false;
    }

    if (this.selectedRadioOption === 'no' && this.selectedCategory) {
      return false;
    }

    return true;
  }
}
