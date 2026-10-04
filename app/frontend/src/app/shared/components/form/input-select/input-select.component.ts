import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Subscription } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { SelectOption } from '../../../models/forms/select-option.model';

@Component({
  selector: 'app-input-select',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatFormFieldModule,
  ],
  templateUrl: './input-select.component.html',
  styleUrls: ['./input-select.component.scss'],
})
export class InputSelectComponent implements OnInit, OnDestroy, OnChanges {
  @Input() placeholder: string = 'Select value';
  @Input() disabled: boolean = false;
  @Input() required: boolean = false;
  @Input() control!: FormControl<unknown>;
  @Input() options: readonly SelectOption[] = [];
  @Input() validatorMessage: string = '';
  @Input() idAttribute: string = 'id';
  @Input() valueAttribute: string = 'value';
  @Input() multiple: boolean = false;
  @Output() valueChange: EventEmitter<unknown> = new EventEmitter<unknown>();

  private controlSubscription?: Subscription;

  constructor(private transloco: TranslocoService) {}

  ngOnInit(): void {
    if (this.control) {
      this.controlSubscription = this.control.valueChanges.subscribe((val) => {
        this.valueChange.emit(val);
      });
    }

    if (this.disabled && this.control) {
      this.control.disable({ emitEvent: false });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['disabled'] && this.control) {
      if (this.disabled) {
        this.control.disable({ emitEvent: false });
      } else {
        this.control.enable({ emitEvent: false });
      }
    }
  }

  ngOnDestroy(): void {
    this.controlSubscription?.unsubscribe();
  }

  getOptionProperty(option: SelectOption, key: string): unknown {
    return (option as Record<string, unknown>)[key];
  }

  getErrorMessage(): string {
    if (!this.control?.errors) {
      return '';
    }

    if (this.validatorMessage) {
      return this.validatorMessage;
    }
    if (this.control.hasError('required')) {
      return this.transloco.translate('form.error.required');
    }
    return this.transloco.translate('form.error.invalid_selection');
  }
}
