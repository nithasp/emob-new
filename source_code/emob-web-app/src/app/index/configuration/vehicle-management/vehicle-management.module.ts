import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VehicleManagementRoutingModule } from './vehicle-management-routing.module';
import { NgbModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { VehicleComponent } from '../vehicle/vehicle.component';
import { VehicleDialogComponent } from '../../components/vehicle-dialog/vehicle-dialog.component';
import { TranslocoModule } from '@jsverse/transloco';
import { MaterialModule } from 'src/app/material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { VehicleManagementComponent } from './vehicle-management.component';

@NgModule({
  declarations: [VehicleComponent, VehicleDialogComponent, VehicleManagementComponent],
  imports: [
    CommonModule,
    VehicleManagementRoutingModule,
    NgbNavModule,
    MaterialModule,
    TranslocoModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class VehicleManagementModule {}
