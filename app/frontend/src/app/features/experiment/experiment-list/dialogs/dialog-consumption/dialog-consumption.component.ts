import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ExperimentCounts } from '../../../models/experiment.model';

@Component({
  selector: 'app-dialog-consumption',
  templateUrl: './dialog-consumption.component.html',
  styleUrl: './dialog-consumption.component.scss',
})
export class DialogConsumptionComponent {
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
