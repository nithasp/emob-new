import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-dialog-details',
  templateUrl: './dialog-details.component.html',
  styleUrl: './dialog-details.component.scss'
})
export class DialogDetailsComponent {
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