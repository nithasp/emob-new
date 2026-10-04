import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { NgbModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslocoModule, TRANSLOCO_SCOPE } from '@jsverse/transloco';
import { MaterialModule } from '@shared/material.module';
import { VehicleManagementRoutingModule } from './vehicle-management-routing.module';

import { DialogVehicleComponent } from './dialogs/dialog-vehicle/dialog-vehicle.component';
import { DialogVehicleProfileTypeItemComponent } from './dialogs/dialog-vehicle-profile-type-item/dialog-vehicle-profile-type-item.component';
import { VehicleManagementComponent } from './vehicle-management.component';
import { VehicleTypeComponent } from './vehicle-type/vehicle-type.component';
import { VehicleComponent } from './vehicle/vehicle.component';
import { DialogVehicleTypeComponent } from './dialogs/dialog-vehicle-type/dialog-vehicle-type.component';
import { InputFieldComponent } from '@shared/components/form/input-field/input-field.component';
import { InputSelectComponent } from '@shared/components/form/input-select/input-select.component';
import { DynamicPopoverComponent } from '@shared/components/dynamic-popover/dynamic-popover.component';
@NgModule({
  declarations: [
    VehicleManagementComponent,
    VehicleComponent,
    VehicleTypeComponent,
    DialogVehicleComponent,
    DialogVehicleProfileTypeItemComponent,
  ],
  imports: [
    DialogVehicleTypeComponent,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModule,
    NgbNavModule,
    TranslocoModule,
    MaterialModule,
    VehicleManagementRoutingModule,
    InputFieldComponent,
    InputSelectComponent,
    DynamicPopoverComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [{ provide: TRANSLOCO_SCOPE, useValue: 'vehicleManagement' }],
})
export class VehicleManagementModule {}
