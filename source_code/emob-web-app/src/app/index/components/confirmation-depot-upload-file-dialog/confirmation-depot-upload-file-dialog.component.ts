import { Component, OnInit, Inject, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-confirmation-depot-upload-file-dialog',
  templateUrl: './confirmation-depot-upload-file-dialog.component.html',
  styleUrls: ['./confirmation-depot-upload-file-dialog.component.scss']
})
export class ConfirmationDepotUploadFileDialogComponent implements OnInit {
  @Input() title: string = "Confirm Action";
  @Input() message?: string;
  @Input() question?: string;
  @Input() acceptButton: string = 'Confirm';
  @Input() disableCancelButton: boolean = false;
  @Input() showRadioOptions: boolean = false;

  selectedRadioOption: string | null = null;

  constructor(
    private activeModal: NgbActiveModal
  ) {
  }
  ngOnInit() {
  }
  onCancleClick() {
    this.activeModal.close(false);
  }
  onConfirmClick(): void {
    this.activeModal.close(true);
  }
  onRadioChange(value: string): void {
    this.selectedRadioOption = value;
  }
  isConfirmDisabled(): boolean {
    if (!this.showRadioOptions) {
      return false;
    }
    return this.selectedRadioOption !== 'yes';
  }
}

