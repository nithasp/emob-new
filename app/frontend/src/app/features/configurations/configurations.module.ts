import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { TRANSLOCO_SCOPE } from '@jsverse/transloco';
import { SharedModule } from '@shared/shared.module';

import { ConfigurationsRoutingModule } from './configurations-routing.module';
import { ConfigurationsComponent } from './configurations.component';
import { UploadComponent } from './upload/upload.component';
import { UploadFileComponent } from './components/upload-file/upload-file.component';

@NgModule({
  declarations: [
    ConfigurationsComponent,
    UploadComponent,
    UploadFileComponent
  ],
  imports: [SharedModule, ConfigurationsRoutingModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [{ provide: TRANSLOCO_SCOPE, useValue: 'index' }],
})
export class ConfigurationsModule {}
