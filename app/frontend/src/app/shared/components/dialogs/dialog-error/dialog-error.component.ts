import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-error-dialog',
  templateUrl: './error-dialog.component.html',
  styleUrls: ['./error-dialog.component.scss'],
})
export class ErrorDialogComponent {
  @Input() title = 'Confirm Action';
  @Input() message: string | string[] = '';

  constructor(private activeModal: NgbActiveModal) {}

  get messages(): string[] {
    if (!this.message) {
      return [];
    }
    return Array.isArray(this.message) ? this.message : [this.message];
  }

  cancel() {
    this.activeModal.close(false);
  }

  confirm() {
    this.activeModal.close(true);
  }
}
