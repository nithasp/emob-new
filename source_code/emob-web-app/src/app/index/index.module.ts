import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { IndexRoutingModule } from './index-routing.module';
import { OverviewComponent } from './overview/overview.component';
import { TaskComponent } from './task/task.component';
import { ResultComponent } from './result/result.component';
import { ConstraintComponent } from './constraint/constraint.component';
import { MaterialModule } from '../material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NavbarComponent } from './default/navbar/navbar.component';
import { TopbarComponent } from './default/topbar/topbar.component';
import { RouterLinkActive, RouterOutlet } from '@angular/router';
import { IndexComponent } from './index.component';
import { NgbModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { ConfirmationDialogComponent } from './default/confirmation-dialog/confirmation-dialog.component';
import { PopoverModule } from '@ngx-popovers/popover';
import { Arrow } from '@ngx-popovers/core';
import { DropzoneDirective } from '../directives/dropzone.directive';
import { TruncatePipe } from '../directives/truncate-pipe.directive';
@NgModule({
  declarations: [
    IndexComponent,
    OverviewComponent,
    TaskComponent,
    ResultComponent,
    ConstraintComponent,
    NavbarComponent,
    TopbarComponent,
    ConfirmationDialogComponent,
    DropzoneDirective,
    TruncatePipe
    
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
    Arrow
    
  ],
  schemas :[CUSTOM_ELEMENTS_SCHEMA ],
})
export class IndexModule { }
