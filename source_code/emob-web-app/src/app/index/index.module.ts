import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { IndexRoutingModule } from './index-routing.module';
import { ExperimentComponent } from './experiment/experiment.component';
import { RunComponent } from './run/run.component';
import { ResultComponent } from './result/result.component';
import { InventoryComponent } from './inventory/inventory.component';
import { MaterialModule } from '../material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NavbarComponent } from './default/navbar/navbar.component';
import { TopbarComponent } from './default/topbar/topbar.component';
import { RouterLinkActive } from '@angular/router';
import { IndexComponent } from './index.component';
import { NgbModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { ConfirmationDialogComponent } from './components/confirmation-dialog/confirmation-dialog.component';
import { PopoverModule } from '@ngx-popovers/popover';
import { Arrow } from '@ngx-popovers/core';
import { DropzoneDirective } from '../directives/dropzone.directive';
import { TruncatePipe } from '../directives/truncate-pipe.directive';
import { NgxSpinnerModule } from "ngx-spinner";
import { NumberCounterInputComponent } from './components/number-counter-input/number-counter-input.component';
import { TimeFormatPipe } from '../directives/timeformat-pipe.directive';
@NgModule({
  declarations: [
    IndexComponent,
    ExperimentComponent,
    RunComponent,
    ResultComponent,
    InventoryComponent,
    NavbarComponent,
    TopbarComponent,
    ConfirmationDialogComponent,
    DropzoneDirective,
    TruncatePipe,
    NumberCounterInputComponent,
    TimeFormatPipe
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
    NgxSpinnerModule
    
  ],
  schemas :[CUSTOM_ELEMENTS_SCHEMA ],

})
export class IndexModule { }
