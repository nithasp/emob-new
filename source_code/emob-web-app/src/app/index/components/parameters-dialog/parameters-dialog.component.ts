import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TimingAndCapacity } from 'src/app/models/constraint.model';

@Component({
  selector: 'app-parameters-dialog',
  templateUrl: './parameters-dialog.component.html',
  styleUrl: './parameters-dialog.component.scss',
})
export class ParametersDialogComponent implements OnInit {
  @Input() paramsVehicle: TimingAndCapacity = {
    backToDepotTime: '',
    earlyDeliveryTime: '',
    numberOfVehicleAvailable: 0,
    vehicleOrderSizeCapacity: 0,
    maximumTravelDistance: 0,
    serviceDurationTime: '',
    maximumWorkDuration: '',
    minimumVehicle: 0
  };

  constructor(private readonly activeModal: NgbActiveModal) {
     
  }

  ngOnInit(): void {}

  onCancleClick() {
    this.activeModal.close(false);
  }
  onConfirmClick(): void {
    this.activeModal.close(true);
  }
}
