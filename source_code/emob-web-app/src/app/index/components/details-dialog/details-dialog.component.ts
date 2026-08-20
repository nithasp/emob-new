import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-details-dialog',
  templateUrl: './details-dialog.component.html',
  styleUrl: './details-dialog.component.scss'
})
export class DetailsDialogComponent {
  @Input() title: string = "Confirm Action";
  @Input() message?: string | string[] = 'No information';
  constructor(
    private readonly activeModal: NgbActiveModal
  ) {
  }
  isArray(checkType: unknown): boolean {
    return Array.isArray(checkType);
  }
  isString(value: unknown): boolean {
    return typeof value === 'string';
  }
  get messageArray(): string[] {
    return Array.isArray(this.message) ? this.message : [];
  }
  onCancleClick() {
    this.activeModal.close(false);
  }
  onConfirmClick(): void {
    this.activeModal.close(true);
  }

  
}