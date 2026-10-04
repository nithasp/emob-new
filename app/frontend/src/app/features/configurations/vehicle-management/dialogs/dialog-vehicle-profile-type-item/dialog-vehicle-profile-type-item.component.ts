import { Component, Input, OnInit, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { VehicleType } from '../../../models/vehicle.model';
import { LoggerService } from '@core/services/logger.service';

@Component({
  selector: 'app-dialog-vehicle-profile-type-item',
  templateUrl: './dialog-vehicle-profile-type-item.component.html',
  styleUrl: './dialog-vehicle-profile-type-item.component.scss',
})
export class DialogVehicleProfileTypeItemComponent implements OnInit {
  private readonly logger = inject(LoggerService);

  @Input() vehicleTypeData!: VehicleType;

  constructor(
    public activeModal: NgbActiveModal
  ) {}

  ngOnInit(): void {
    this.logger.log('vehicleTypeData', this.vehicleTypeData);
  }
}
