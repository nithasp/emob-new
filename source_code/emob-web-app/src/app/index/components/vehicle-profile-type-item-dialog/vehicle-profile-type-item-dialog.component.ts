import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import {
  VehicleType,
  VehicleProfileTypeEnum,
} from 'src/app/models/vehicle.model';

@Component({
  selector: 'app-vehicle-profile-type-item-dialog',
  templateUrl: './vehicle-profile-type-item-dialog.component.html',
  styleUrl: './vehicle-profile-type-item-dialog.component.scss',
})
export class VehicleProfileTypeItemDialogComponent implements OnInit {
  @Input() vehicleTypeData!: VehicleType;

  constructor(
    public activeModal: NgbActiveModal
  ) {}

  ngOnInit(): void {
    console.log('vehicleTypeData', this.vehicleTypeData);
  }
}
