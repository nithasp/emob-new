import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Constraint } from 'src/app/models/constraint.model';
import { Vehicle } from 'src/app/models/vehicle.model';

@Component({
  selector: 'app-parameters-dialog',
  templateUrl: './parameters-dialog.component.html',
  styleUrl: './parameters-dialog.component.scss',
})
export class ParametersDialogComponent implements OnInit {
  @Input() paramsVehicle: Constraint = {
    availableCar: 0,
    limitVehicleCapacity: 0,
    deliveryTime: '',
    backToDepotTime: '',
    maxTravelDistance: 0,
    MaxWorkDuration: 0,
    earlyDeliveryTime: '',
    maximumWorkDuration: '',
    numberOfVehicleAvailable: 0,
    vehicleOrderSizeCapacity: 0,
    maximumTravelDistance: 0,
    serviceDurationTime: ''
  };

  constructor(private readonly activeModal: NgbActiveModal) {
     
  }

  ngOnInit(): void {
    console.log('this.paramsVehicle', this.paramsVehicle);
  }

  onCancleClick() {
    this.activeModal.close(false);
  }
  onConfirmClick(): void {
    this.activeModal.close(true);
  }
}
