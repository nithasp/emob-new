import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { CommonModule } from '@angular/common';
import { ConfigurationRoutingModule } from './configuration-routing.module';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { TRANSLOCO_SCOPE, TranslocoModule } from '@jsverse/transloco';

import { ConfigurationComponent } from './configuration.component';
import { UploadComponent } from './upload/upload.component';
import { UploadFileComponent } from './upload-file/upload-file.component';

import {
  NgbModule,
} from '@ng-bootstrap/ng-bootstrap';
import { IndexModule } from '../index.module';
import { NgxSpinnerModule } from 'ngx-spinner';

@NgModule({
  declarations: [ConfigurationComponent, UploadComponent, UploadFileComponent],
  imports: [
    CommonModule,
    ConfigurationRoutingModule,
    IndexModule,
    TranslocoModule,
    NgbModule,
    MaterialModule,
    FormsModule,
    NgxSpinnerModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [{ provide: TRANSLOCO_SCOPE, useValue: 'index' }],
})
export class ConfigurationModule {}
