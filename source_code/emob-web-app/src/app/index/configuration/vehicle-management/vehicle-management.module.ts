import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { NgbModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslocoModule } from '@jsverse/transloco';
import { MaterialModule } from 'src/app/material.module';
import { VehicleManagementRoutingModule } from './vehicle-management-routing.module';

import { VehicleDialogComponent } from '../../components/vehicle-dialog/vehicle-dialog.component';
import { VehicleManagementComponent } from './vehicle-management.component';
import { VehicleTypeComponent } from './vehicle-type/vehicle-type.component';
import { VehicleComponent } from './vehicle/vehicle.component';
import { VehicleTypeDialogComponent } from './dialogs/vehicle-type-dialog/vehicle-type-dialog.component';
import { InputTextComponent } from 'src/app/shared/components/form/input-text/input-text.component';
import { InputSelectComponent } from 'src/app/shared/components/form/input-select/input-select.component';
import { DynamicPopoverComponent } from 'src/app/shared/components/dynamic-popover/dynamic-popover.component';

@NgModule({
  declarations: [
    VehicleManagementComponent,
    VehicleComponent,
    VehicleTypeComponent,
    VehicleDialogComponent,
    VehicleTypeDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModule,
    NgbNavModule,
    TranslocoModule,
    MaterialModule,
    VehicleManagementRoutingModule,
    InputTextComponent,
    InputSelectComponent,
    DynamicPopoverComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class VehicleManagementModule {}
