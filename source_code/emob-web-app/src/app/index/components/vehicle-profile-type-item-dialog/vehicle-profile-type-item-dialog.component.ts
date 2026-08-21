import { Component, Input, OnInit, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import {
  VehicleType,
  VehicleProfileTypeEnum,
} from 'src/app/models/vehicle.model';
import { LoggerService } from 'src/app/services/logger.service';

@Component({
  selector: 'app-vehicle-profile-type-item-dialog',
  templateUrl: './vehicle-profile-type-item-dialog.component.html',
  styleUrl: './vehicle-profile-type-item-dialog.component.scss',
})
export class VehicleProfileTypeItemDialogComponent implements OnInit {
  private readonly logger = inject(LoggerService);

  @Input() vehicleTypeData!: VehicleType;

  constructor(
    public activeModal: NgbActiveModal
  ) {}

  ngOnInit(): void {
    this.logger.log('vehicleTypeData', this.vehicleTypeData);
  }
}
