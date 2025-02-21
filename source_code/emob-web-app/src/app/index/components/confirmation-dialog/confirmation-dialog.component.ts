import { Component, OnInit, Inject, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss']
})
export class ConfirmationDialogComponent implements OnInit {
  @Input() title: string = "Confirm Action";
  @Input() message?: string;
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
}