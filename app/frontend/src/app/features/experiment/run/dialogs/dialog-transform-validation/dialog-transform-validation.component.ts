import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TRANSLOCO_SCOPE, TranslocoService } from '@jsverse/transloco';
import { TransformResult } from '../../../models/experiment.model';
import { ValidationTableRow } from '../../../models/validation-table.model';
import { buildTableRows, createCachedValidationMessageFn } from '../../utils/validation-table.utils';

@Component({
  selector: 'app-dialog-transform-validation',
  templateUrl: './dialog-transform-validation.component.html',
  styleUrls: ['./dialog-transform-validation.component.scss'],
  providers: [{ provide: TRANSLOCO_SCOPE, useValue: ['index', 'validation'] }],
})
export class DialogTransformValidationComponent implements OnInit {
  @Input() validationResponse?: TransformResult;

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

  getValidationMessage(type: string, params: Record<string, unknown>): string {
    return this.cachedGetValidationMessage(type, params);
  }

  close(): void {
    this.activeModal.close();
  }
}
