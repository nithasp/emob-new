import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ExperimentCounts } from 'src/app/models/experiment.model';

@Component({
  selector: 'app-consumption-dialog',
  templateUrl: './consumption-dialog.component.html',
  styleUrl: './consumption-dialog.component.scss',
})
export class ConsumptionDialogComponent {
  @Input() paramsConsumption: ExperimentCounts = {
    countGeocoding: 0,
    countReroute: 0,
  };

  constructor(private readonly activeModal: NgbActiveModal) {}

  onCancleClick() {
    this.activeModal.close(false);
  }
  onConfirmClick(): void {
    this.activeModal.close(true);
  }
}
