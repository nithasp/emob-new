import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-details-dialog',
  templateUrl: './details-dialog.component.html',
  styleUrl: './details-dialog.component.scss'
})
export class DetailsDialogComponent {
  @Input() title: string = "Confirm Action";
  @Input() message?: string | string[];
  constructor(
    private readonly activeModal: NgbActiveModal
  ) {
  }
  isArray(checkType: any): boolean {
    return Array.isArray(checkType);
  }
  isString(value: any): boolean {
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