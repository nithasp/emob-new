import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { VehicleProfileTypeEnum } from 'src/app/models/vehicle.model';

@Component({
  selector: 'app-vehicle-profile-type-item-dialog',
  templateUrl: './vehicle-profile-type-item-dialog.component.html',
  styleUrl: './vehicle-profile-type-item-dialog.component.scss',
})
export class VehicleProfileTypeItemDialogComponent {
  @Input() type!: VehicleProfileTypeEnum | string;

  constructor(public activeModal: NgbActiveModal) {}
}
