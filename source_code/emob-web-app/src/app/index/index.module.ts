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
import { NgbModule, NgbNavModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { ConfirmationDialogComponent } from './components/confirmation-dialog/confirmation-dialog.component';
import { PopoverModule } from '@ngx-popovers/popover';
import { Arrow } from '@ngx-popovers/core';
import { DropzoneDirective } from '../directives/dropzone.directive';
import { TruncatePipe } from '../directives/truncate-pipe.directive';
import { NgxSpinnerModule } from "ngx-spinner";
import { NumberCounterInputComponent } from './components/number-counter-input/number-counter-input.component';
import { TimeFormatPipe } from '../directives/timeformat-pipe.directive';
import { TopbarComponent } from './default/topbar/topbar.component';
import { CustomerDetailsComponent } from './components/customer-details/customer-details.component';
import { DetailsDialogComponent } from './components/details-dialog/details-dialog.component';
import { VerifyLocationDialogComponent } from './components/verify-location-dialog/verify-location-dialog.component';
import { MarkLocationDialogComponent } from './components/mark-location-dialog/mark-location-dialog.component';
import { CustomerListComponent } from './components/customer-list/customer-list.component';
import { FilterPipe } from '../directives/filter-pipe.directive';
import { ResizableDirective } from '../directives/resizable.directive';
import { UploadFileComponent } from './configuration/upload-file/upload-file.component';
import { MapDetailsDialogComponent } from './components/map-details-dialog/map-details-dialog.component';
import { OverlayModule } from '@angular/cdk/overlay';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ParametersDialogComponent } from './components/parameters-dialog/parameters-dialog.component';

@NgModule({
  declarations: [
    IndexComponent,
    ExperimentComponent,
    RunComponent,
    ResultComponent,
    ConfigurationComponent,
    NavbarComponent,
    ConfirmationDialogComponent,
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
    ResizableDirective,
    UploadFileComponent,
    MapDetailsDialogComponent,
    ParametersDialogComponent
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
    DragDropModule
    
  ],
  schemas :[CUSTOM_ELEMENTS_SCHEMA ],

})
export class IndexModule { }
