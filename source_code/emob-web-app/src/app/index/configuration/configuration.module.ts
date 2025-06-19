import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ConfigurationRoutingModule } from './configuration-routing.module';
import { ConfigurationComponent } from './configuration.component';
import { UploadComponent } from './upload/upload.component';
import { UploadFileComponent } from './upload-file/upload-file.component';
import { MaterialModule } from 'src/app/material.module';
import { TRANSLOCO_SCOPE, TranslocoModule } from '@jsverse/transloco';
import { IndexRoutingModule } from '../index-routing.module';
import { RouterLinkActive } from '@angular/router';
import { PopoverModule } from '@ngx-popovers/popover';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  NgbModule,
  NgbNavModule,
  NgbTooltipModule,
} from '@ng-bootstrap/ng-bootstrap';
import { Arrow } from '@ngx-popovers/core';
import { NgxSpinnerModule } from 'ngx-spinner';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { OverlayModule } from '@angular/cdk/overlay';
import { DropzoneDirective } from 'src/app/directives/dropzone.directive';
import { FilterPipe } from 'src/app/directives/filter-pipe.directive';
import { ResizableDirective } from 'src/app/directives/resizable.directive';
import { SnakeCasePipe } from 'src/app/directives/snakecase.pipe.directive';
import { TimeFormatPipe } from 'src/app/directives/timeformat-pipe.directive';
import { TruncatePipe } from 'src/app/directives/truncate-pipe.directive';
import { ConfirmationDialogComponent } from '../components/confirmation-dialog/confirmation-dialog.component';
import { ConsumptionDialogComponent } from '../components/consumption-dialog/consumption-dialog.component';
import { CustomerDetailsComponent } from '../components/customer-details/customer-details.component';
import { CustomerListComponent } from '../components/customer-list/customer-list.component';
import { DetailsDialogComponent } from '../components/details-dialog/details-dialog.component';
import { ErrorDialogComponent } from '../components/error-dialog/error-dialog.component';
import { MapDetailsDialogComponent } from '../components/map-details-dialog/map-details-dialog.component';
import { MarkLocationDialogComponent } from '../components/mark-location-dialog/mark-location-dialog.component';
import { NumberCounterInputComponent } from '../components/number-counter-input/number-counter-input.component';
import { ParametersDialogComponent } from '../components/parameters-dialog/parameters-dialog.component';
import { VerifyLocationDialogComponent } from '../components/verify-location-dialog/verify-location-dialog.component';
import { NavbarComponent } from '../default/navbar/navbar.component';
import { TopbarComponent } from '../default/topbar/topbar.component';
import { ExperimentComponent } from '../experiment/experiment.component';
import { IndexComponent } from '../index.component';
import { ResultComponent } from '../result/result.component';
import { RunComponent } from '../run/run.component';
import { IndexModule } from '../index.module';

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
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [{ provide: TRANSLOCO_SCOPE, useValue: 'index' }],
})
export class ConfigurationModule {}
