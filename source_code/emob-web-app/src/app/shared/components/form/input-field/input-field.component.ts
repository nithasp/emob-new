import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ElementRef,
  Renderer2,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Subscription } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-input-field',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    ReactiveFormsModule,
  ],
  templateUrl: './input-field.component.html',
  styleUrls: ['./input-field.component.scss'],
})
export class InputFieldComponent
  implements OnInit, OnDestroy, OnChanges
{
  @Input() placeholder: string = 'Enter value';
  @Input() type: string = 'text';
  @Input() disabled: boolean = false;
  @Input() readonly: boolean = false;
  @Input() required: boolean = false;
  @Input() value: string = '';
  @Input() height?: string;

  // Callers bind controls of many value types (string, number, enum, null) and this
  // component reads/writes them as strings; narrowing to `unknown` would need casts
  // here and break the 30+ strictTemplates bindings that pass typed FormControls.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() control?: FormControl<any>;
  @Input() decimal: number = 0;
  @Input() comma: boolean = false;
  @Input() suffix: string = '';
  @Input() suffixIcon?: string; // Icon name for dynamic suffix icon button
  @Input() suffixClickable: boolean = false; // Whether the suffix icon should be clickable

  @Output() valueChange: EventEmitter<string> = new EventEmitter<string>();
  @Output() suffixIconClick: EventEmitter<void> = new EventEmitter<void>(); // Event emitter for suffix icon clicks

  private controlSubscription?: Subscription;

  passwordVisible: boolean = false;
  internalControl: FormControl = new FormControl('');

  constructor(
    private renderer: Renderer2,
    private elementRef: ElementRef,
    private transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    if (!this.control) {
      this.control = this.internalControl;
    }

    if (this.control) {
      this.controlSubscription = this.control.valueChanges.subscribe((val) => {
        this.value = val;
        this.valueChange.emit(val);
      });
    }

    if (this.disabled && this.control) {
      this.control.disable({ emitEvent: false });
    }

    this.updateParentDisabledState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['disabled'] && this.control) {
      if (this.disabled) {
        this.control.disable({ emitEvent: false });
      } else {
        this.control.enable({ emitEvent: false });
      }

      this.updateParentDisabledState();
    }

    if (changes['control'] && changes['control'].currentValue) {
      if (this.controlSubscription) {
        this.controlSubscription.unsubscribe();
      }
      this.control = changes['control'].currentValue;
      this.controlSubscription = this.control!.valueChanges.subscribe((val) => {
        this.value = val;
        this.valueChange.emit(val);
      });
    }
  }

  ngOnDestroy(): void {
    this.controlSubscription?.unsubscribe();
  }

  get computedInputType(): string {
    if (this.type === 'number') {
      return 'text';
    }
    if (this.type === 'password') {
      return this.passwordVisible ? 'text' : 'password';
    }
    return this.type;
  }

  onKeyPress(event: KeyboardEvent): void {
    if (!this.control) {
      return;
    }
    if (this.type === 'number') {
      if (/[0-9]/.test(event.key)) {
        return;
      }
      if (this.decimal > 0 && event.key === '.') {
        const currentValue: string = this.control.value || '';
        if (currentValue.indexOf('.') === -1) {
          return;
        }
      }
      event.preventDefault();
    }
  }

  onInput(event: Event): void {
    if (!this.control) {
      return;
    }
    const input = event.target as HTMLInputElement;
    if (this.type === 'number') {
      const rawValue = input.value;
      const formattedValue = this.formatNumber(rawValue, this.decimal);
      if (formattedValue !== rawValue) {
        this.control.setValue(formattedValue, { emitEvent: false });
        this.value = formattedValue;
      }
    }
  }

  onBlur(): void {
    if (this.control) {
      this.control.markAsTouched();

      if (this.control.value === null) {
        return;
      }

      if (this.type === 'number') {
        const currentValue = String(this.control.value);
        const formattedValue = this.formatNumber(currentValue, this.decimal);
        if (formattedValue !== currentValue) {
          this.control.setValue(formattedValue, { emitEvent: false });
        }
      }

      if (this.control.value === '') {
        this.control.setValue(null, { emitEvent: false });
      }
    }
  }

  formatNumber(value: string, decimals: number): string {
    let result = '';
    let dotFound = false;
    for (const char of value) {
      if (/[0-9]/.test(char)) {
        result += char;
      } else if (char === '.' && decimals > 0 && !dotFound) {
        dotFound = true;
        result += char;
      }
    }

    if (dotFound && decimals >= 0) {
      const parts = result.split('.');
      if (parts.length > 1) {
        parts[1] = parts[1].slice(0, decimals);
      }
      result = parts.join('.');
    }

    if (this.comma) {
      const parts = result.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      result = parts.join('.');
    }
    return result;
  }

  getErrorMessage(): string {
    if (!this.control?.errors) return '';

    if (this.control.hasError('required')) {
      return this.transloco.translate('form.error.required');
    }
    if (this.control.hasError('email')) {
      return this.transloco.translate('form.error.email');
    }
    if (this.control.hasError('timeRangeInvalid')) {
      return this.control.getError('timeRangeInvalid');
    }
    if (this.control.hasError('licensePlatesEmpty')) {
      return this.transloco.translate('form.error.license_plates_empty');
    }
    if (this.control.hasError('licensePlateDuplicate')) {
      return this.transloco.translate('form.error.license_plate_duplicate');
    }
    if (this.control.hasError('min')) {
      return this.transloco.translate('form.error.min', {
        min: this.control.getError('min').min,
      });
    }
    if (this.control.hasError('max')) {
      return this.transloco.translate('form.error.max', {
        max: this.control.getError('max').max,
      });
    }

    return this.transloco.translate('form.error.invalid_input');
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  onSuffixIconClick(): void {
    if (this.suffixClickable && !this.disabled) {
      this.suffixIconClick.emit();
    }
  }

  updateParentDisabledState(): void {
    const parentElement = this.elementRef.nativeElement.parentElement;
    if (parentElement) {
      if (this.disabled) {
        this.renderer.addClass(parentElement, 'input-field-disabled');
      } else {
        this.renderer.removeClass(parentElement, 'input-field-disabled');
      }
    }
  }
}
