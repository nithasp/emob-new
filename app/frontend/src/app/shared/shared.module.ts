import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerModule } from 'ngx-spinner';
import { TranslocoModule } from '@jsverse/transloco';

import { MaterialModule } from './material.module';
import { DialogConfirmationComponent } from './components/dialogs/dialog-confirmation/dialog-confirmation.component';
import { DialogDetailsComponent } from './components/dialogs/dialog-details/dialog-details.component';
import { DialogErrorComponent } from './components/dialogs/dialog-error/dialog-error.component';
import { DynamicPopoverComponent } from './components/dynamic-popover/dynamic-popover.component';
import { InputFieldComponent } from './components/form/input-field/input-field.component';
import { InputSelectComponent } from './components/form/input-select/input-select.component';
import { NumberCounterInputComponent } from './components/form/number-counter-input/number-counter-input.component';
import { DropzoneDirective } from './directives/dropzone.directive';
import { ResizableDirective } from './directives/resizable.directive';
import { FilterPipe } from './pipes/filter.pipe';
import { FormatStringDatePipe } from './pipes/format-string-date.pipe';
import { SnakeCasePipe } from './pipes/snake-case.pipe';
import { TimeFormatPipe } from './pipes/time-format.pipe';
import { TruncatePipe } from './pipes/truncate.pipe';

const STANDALONE_COMPONENTS = [
  DynamicPopoverComponent,
  InputFieldComponent,
  InputSelectComponent,
];

const DECLARATIONS = [
  DialogConfirmationComponent,
  DialogDetailsComponent,
  DialogErrorComponent,
  NumberCounterInputComponent,
  DropzoneDirective,
  ResizableDirective,
  FilterPipe,
  FormatStringDatePipe,
  SnakeCasePipe,
  TimeFormatPipe,
  TruncatePipe,
];

const MODULES = [
  CommonModule,
  FormsModule,
  ReactiveFormsModule,
  MaterialModule,
  NgbModule,
  NgxSpinnerModule,
  TranslocoModule,
];

@NgModule({
  declarations: DECLARATIONS,
  imports: [...MODULES, ...STANDALONE_COMPONENTS],
  exports: [...MODULES, ...STANDALONE_COMPONENTS, ...DECLARATIONS],
})
export class SharedModule {}
