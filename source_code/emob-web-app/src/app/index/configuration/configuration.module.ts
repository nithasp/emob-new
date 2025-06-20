import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigurationRoutingModule } from './configuration-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { TRANSLOCO_SCOPE, TranslocoModule } from '@jsverse/transloco';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { IndexModule } from '../index.module';
import { NgxSpinnerModule } from 'ngx-spinner';

import { ConfigurationComponent } from './configuration.component';
import { UploadComponent } from './upload/upload.component';
import { UploadFileComponent } from './upload-file/upload-file.component';
import { VehicleComponent } from './vehicle/vehicle.component';
import { VehicleDialogComponent } from '../components/vehicle-dialog/vehicle-dialog.component';

@NgModule({
  declarations: [
    ConfigurationComponent,
    UploadComponent,
    UploadFileComponent,
    VehicleComponent,
    VehicleDialogComponent,
  ],
  imports: [
    CommonModule,
    ConfigurationRoutingModule,
    IndexModule,
    TranslocoModule,
    NgbModule,
    MaterialModule,
    FormsModule,
    NgxSpinnerModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    NgbModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [{ provide: TRANSLOCO_SCOPE, useValue: 'index' }],
})
export class ConfigurationModule {}
