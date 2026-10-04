import { Component } from '@angular/core';
import { RunStateService } from '../../../services/run-state.service';
import { RunVehicleService } from '../../../services/run-vehicle.service';
import { RunVehiclePoolService } from '../../../services/run-vehicle-pool.service';

@Component({
  selector: 'app-run-vehicle-pool',
  templateUrl: './run-vehicle-pool.component.html',
  styleUrl: './run-vehicle-pool.component.scss',
})
export class RunVehiclePoolComponent {
  constructor(
    protected readonly state: RunStateService,
    protected readonly fleet: RunVehicleService,
    protected readonly pool: RunVehiclePoolService,
  ) {}

  openPoolVehicleTypeInfo(event: Event, vehicleTypeId: string): void {
    event.stopPropagation();
    this.fleet.openVehicleItemModal(vehicleTypeId);
  }
}
