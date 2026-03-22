import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TRANSLOCO_SCOPE } from '@jsverse/transloco';

export interface ValidationTableRow {
  fileName: string;
  type: string;
  params: Record<string, any>;
}

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
      this.tableRows = this.buildTableRows(this.validationResponse);
    }
  }

  buildTableRows(response: any): ValidationTableRow[] {
    const rows: ValidationTableRow[] = [];

    if (!response?.error?.length) return rows;

    for (const error of response.error) {
      if (!error.detail?.length) continue;

      for (const detail of error.detail) {
        rows.push({
          fileName: error.title,
          type: detail.type,
          params: this.buildTranslationParams(detail),
        });
      }
    }

    return rows;
  }

  close(): void {
    this.activeModal.close();
  }

  private buildTranslationParams(detail: any): Record<string, any> {
    const params: Record<string, any> = {};

    for (const [key, value] of Object.entries(detail)) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          params[`${key}[${index}]`] = item ?? '';
        });
      } else if (key === 'input') {
        params[key] = this.formatInputValue(value, detail.inputType);
      } else if (value !== null && typeof value === 'object') {
        params[key] = this.formatNestedValues(value as Record<string, any>);
      } else {
        params[key] = value ?? '';
      }
    }

    return params;
  }

  private formatInputValue(value: any, inputType?: string): string {
    if (value === null || value === undefined) return '';
    if (inputType === 'float' && typeof value === 'number') {
      return Number.isInteger(value) ? value.toFixed(1) : String(value);
    }
    return String(value);
  }

  private formatNestedValues(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.formatNestedValues(value);
      } else if (typeof value === 'number') {
        result[key] = Number.isInteger(value) ? value.toFixed(1) : String(value);
      } else {
        result[key] = value ?? '';
      }
    }

    return result;
  }
}
