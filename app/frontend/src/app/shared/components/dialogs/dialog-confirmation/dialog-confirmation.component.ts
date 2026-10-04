import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-dialog-confirmation',
  templateUrl: './dialog-confirmation.component.html',
  styleUrls: ['./dialog-confirmation.component.scss']
})
export class DialogConfirmationComponent {
  @Input() title: string = "Confirm Action";
  @Input() message?: string;
  @Input() question?: string;
  @Input() acceptButton: string = 'Confirm';
  @Input() disableCancelButton: boolean = false;

  constructor(
    private activeModal: NgbActiveModal
  ) {
  }
  onCancleClick() {
    this.activeModal.close(false);
  }
  onConfirmClick(): void {
    this.activeModal.close(true);
  }
}