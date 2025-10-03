import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TimingAndCapacity } from 'src/app/models/constraint.model';

@Component({
  selector: 'app-parameters-dialog',
  templateUrl: './parameters-dialog.component.html',
  styleUrl: './parameters-dialog.component.scss',
})
export class ParametersDialogComponent implements OnInit {
  @Input() paramsVehicle: Partial<Record<string, string | number>> = {};

  public parameterEntries: Array<{ key: string; value: string | number } > = [];

  constructor(private readonly activeModal: NgbActiveModal) {}

  ngOnInit(): void {
    this.parameterEntries = Object.entries(this.paramsVehicle || {}).map(
      ([key, value]) => ({ key, value: value as string | number })
    );
  }

  isNumeric(value: unknown): value is number {
    return typeof value === 'number' && isFinite(value as number);
  }

  onCancleClick() {
    this.activeModal.close(false);
  }
  onConfirmClick(): void {
    this.activeModal.close(true);
  }
}
