import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TRANSLOCO_SCOPE, TranslocoService } from '@jsverse/transloco';
import { ValidationTableRow } from 'src/app/models/validation-table.model';
import { buildTableRows, createCachedValidationMessageFn } from 'src/app/shared/utils/validation-table.utils';

@Component({
  selector: 'app-transform-validation-dialog',
  templateUrl: './transform-validation-dialog.component.html',
  styleUrls: ['./transform-validation-dialog.component.scss'],
  providers: [{ provide: TRANSLOCO_SCOPE, useValue: ['index', 'validation'] }],
})
export class TransformValidationDialogComponent implements OnInit {
  @Input() validationResponse: any;

  tableRows: ValidationTableRow[] = [];
  private cachedGetValidationMessage!: ReturnType<typeof createCachedValidationMessageFn>;

  constructor(
    public activeModal: NgbActiveModal,
    private readonly transloco: TranslocoService,
  ) {}

  ngOnInit(): void {
    this.cachedGetValidationMessage = createCachedValidationMessageFn(this.transloco);
    if (this.validationResponse) {
      this.tableRows = buildTableRows(this.validationResponse?.error || []);
    }
  }

  getValidationMessage(type: string, params: any): string {
    return this.cachedGetValidationMessage(type, params);
  }

  close(): void {
    this.activeModal.close();
  }
}
