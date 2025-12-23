import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  ViewChild,
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
  implements OnInit, OnDestroy, AfterViewInit, OnChanges
{
  @Input() placeholder: string = 'Enter value';
  @Input() type: string = 'text';
  @Input() disabled: boolean = false;
  @Input() readonly: boolean = false;
  @Input() required: boolean = false;
  @Input() value: string = '';
  @Input() height?: string;

  @Input() control?: FormControl<any>;
  @Input() decimal: number = 0;
  @Input() comma: boolean = false;
  @Input() suffix: string = '';
  @Input() suffixIcon?: string; // Icon name for dynamic suffix icon button
  @Input() suffixClickable: boolean = false; // Whether the suffix icon should be clickable

  @Output() valueChange: EventEmitter<string> = new EventEmitter<string>();
  @Output() suffixIconClick: EventEmitter<void> = new EventEmitter<void>(); // Event emitter for suffix icon clicks

  @ViewChild('inputElement') inputElement!: ElementRef<HTMLInputElement>;

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

  ngAfterViewInit(): void {
    if (this.type === 'thaiCitizenId' && this.inputElement) {
      this.renderer.setAttribute(
        this.inputElement.nativeElement,
        'maxLength',
        '17'
      );
    }
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
    if (this.type === 'thaiCitizenId' || this.type === 'number') {
      return 'text';
    }
    if (this.type === 'password') {
      return this.passwordVisible ? 'text' : 'password';
    }
    return this.type;
  }

  formatThaiCitizenId: (value: string) => string = (value: string): string => {
    const groups = [1, 4, 5, 2, 1];
    let result = '';
    let pos = 0;

    for (let i = 0; i < groups.length; i++) {
      if (pos >= value.length) break;
      const groupLen = groups[i];
      const currentGroup = value.substring(pos, pos + groupLen);
      result += (result.length ? '-' : '') + currentGroup;
      pos += currentGroup.length;
    }

    return result;
  };

  onKeyPress(event: KeyboardEvent): void {
    if (!this.control) {
      return;
    }
    if (this.type === 'thaiCitizenId') {
      if (!/[0-9]/.test(event.key)) {
        event.preventDefault();
      }
    } else if (this.type === 'number') {
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
    if (this.type === 'thaiCitizenId') {
      const digitsOnly = input.value.replace(/\D/g, '');
      const formattedValue = this.formatThaiCitizenId(digitsOnly);
      if (formattedValue !== input.value) {
        this.control.setValue(formattedValue, { emitEvent: false });
        this.value = formattedValue;
      }
    } else if (this.type === 'number') {
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
      if (this.type === 'thaiCitizenId') {
        const digitsOnly = String(this.control.value).replace(/\D/g, '');
        const formattedValue = this.formatThaiCitizenId(digitsOnly);
        if (formattedValue !== this.control.value) {
          this.control.setValue(formattedValue, { emitEvent: false });
        }
      } else if (this.type === 'number') {
        const currentValue = String(this.control.value);
        const formattedValue = this.formatNumber(currentValue, this.decimal);
        if (formattedValue !== currentValue) {
          this.control.setValue(formattedValue, { emitEvent: false });
        }
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
    if (this.control.hasError('invalidCharacters')) {
      return this.transloco.translate('form.error.thai_citizen_id_digits');
    }
    if (this.control.hasError('invalidLength')) {
      return this.transloco.translate('form.error.thai_citizen_id_length');
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