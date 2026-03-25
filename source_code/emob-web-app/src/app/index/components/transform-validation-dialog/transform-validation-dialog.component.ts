import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TRANSLOCO_SCOPE } from '@jsverse/transloco';
import { ValidationTableRow } from 'src/app/models/validation-table.model';
import { buildTableRows } from 'src/app/shared/utils/validation-table.utils';

@Component({
  selector: 'app-transform-validation-dialog',
  templateUrl: './transform-validation-dialog.component.html',
  styleUrls: ['./transform-validation-dialog.component.scss'],
  providers: [{ provide: TRANSLOCO_SCOPE, useValue: 'validation' }],
})
export class TransformValidationDialogComponent implements OnInit {
  @Input() validationResponse: any;

  tableRows: ValidationTableRow[] = [];

  constructor(public activeModal: NgbActiveModal) {}

  ngOnInit(): void {
    if (this.validationResponse) {
      this.tableRows = buildTableRows(this.validationResponse?.error || []);
    }
  }

  close(): void {
    this.activeModal.close();
  }
}
