import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-transform-validation-dialog',
  templateUrl: './transform-validation-dialog.component.html',
  styleUrls: ['./transform-validation-dialog.component.scss'],
})
export class TransformValidationDialogComponent {
 
  constructor(public activeModal: NgbActiveModal) {}

  

  close(): void {
    this.activeModal.close();
  }
}
