import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { IndexRoutingModule } from './index-routing.module';
import { ExperimentComponent } from './experiment/experiment.component';
import { RunComponent } from './run/run.component';
import { ResultComponent } from './result/result.component';
import { ConfigurationComponent } from './configuration/configuration.component';
import { MaterialModule } from '../material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NavbarComponent } from './default/navbar/navbar.component';
import { RouterLinkActive } from '@angular/router';
import { IndexComponent } from './index.component';
import {
  NgbModule,
  NgbNavModule,
  NgbTooltipModule,
} from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { ConfirmationDialogComponent } from './components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDepotUploadFileDialogComponent } from './components/confirmation-depot-upload-file-dialog/confirmation-depot-upload-file-dialog.component';
import { PopoverModule } from '@ngx-popovers/popover';
import { Arrow } from '@ngx-popovers/core';
import { DropzoneDirective } from '../directives/dropzone.directive';
import { TruncatePipe } from '../directives/truncate-pipe.directive';
import { NgxSpinnerModule } from 'ngx-spinner';
import { NumberCounterInputComponent } from './components/number-counter-input/number-counter-input.component';
import { TimeFormatPipe } from '../directives/timeformat-pipe.directive';
import { FormatStringDatePipe } from '../directives/format-string-date.pipe';
import { TopbarComponent } from './default/topbar/topbar.component';
import { CustomerDetailsComponent } from './components/customer-details/customer-details.component';
import { DetailsDialogComponent } from './components/details-dialog/details-dialog.component';
import { VerifyLocationDialogComponent } from './components/verify-location-dialog/verify-location-dialog.component';
import { MarkLocationDialogComponent } from './components/mark-location-dialog/mark-location-dialog.component';
import { CustomerListComponent } from './components/customer-list/customer-list.component';
import { FilterPipe } from '../directives/filter-pipe.directive';
import { SnakeCasePipe } from '../directives/snakecase.pipe.directive';
import { ResizableDirective } from '../directives/resizable.directive';
import { UploadFileComponent } from './configuration/upload-file/upload-file.component';
import { MapDetailsDialogComponent } from './components/map-details-dialog/map-details-dialog.component';
import { OverlayModule } from '@angular/cdk/overlay';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ParametersDialogComponent } from './components/parameters-dialog/parameters-dialog.component';
import { ConsumptionDialogComponent } from './components/consumption-dialog/consumption-dialog.component';
import { ErrorDialogComponent } from './components/error-dialog/error-dialog.component';
import { VehicleProfileTypeItemDialogComponent } from './components/vehicle-profile-type-item-dialog/vehicle-profile-type-item-dialog.component';

import { TranslocoModule, TRANSLOCO_SCOPE } from '@jsverse/transloco';
import { DynamicPopoverComponent } from '../shared/components/dynamic-popover/dynamic-popover.component';
import { VehicleEnumConfigs } from '../models/vehicle.model';
import { VehicleTypeDialogComponent } from './components/vehicle-type-dialog/vehicle-type-dialog.component';
import { InputSelectComponent } from '../shared/components/form/input-select/input-select.component';
import { InputFieldComponent } from '../shared/components/form/input-field/input-field.component';

@NgModule({
  declarations: [
    IndexComponent,
    ExperimentComponent,
    RunComponent,
    ResultComponent,
    ConfigurationComponent,
    NavbarComponent,
    ConfirmationDialogComponent,
    ConfirmationDepotUploadFileDialogComponent,
    DropzoneDirective,
    TruncatePipe,
    NumberCounterInputComponent,
    TimeFormatPipe,
    TopbarComponent,
    CustomerDetailsComponent,
    DetailsDialogComponent,
    VerifyLocationDialogComponent,
    MarkLocationDialogComponent,
    CustomerListComponent,
    FilterPipe,
    SnakeCasePipe,
    ResizableDirective,
    UploadFileComponent,
    MapDetailsDialogComponent,
    ParametersDialogComponent,
    ConsumptionDialogComponent,
    VehicleProfileTypeItemDialogComponent,
    VehicleTypeDialogComponent,
    ErrorDialogComponent,
    FormatStringDatePipe
  ],
  imports: [
    IndexRoutingModule,
    RouterLinkActive,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    NgbNavModule,
    NgbModule,
    CommonModule,
    PopoverModule,
    Arrow,
    NgxSpinnerModule,
    NgbTooltipModule,
    OverlayModule,
    DragDropModule,
    TranslocoModule,
    DynamicPopoverComponent,
    InputFieldComponent,
    InputSelectComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [{ provide: TRANSLOCO_SCOPE, useValue: 'index' }],
})
export class IndexModule {}
