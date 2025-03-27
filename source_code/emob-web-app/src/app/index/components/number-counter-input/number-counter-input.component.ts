import { Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-number-counter-input',
  templateUrl: './number-counter-input.component.html',
  styleUrls: ['./number-counter-input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: forwardRef(() => NumberCounterInputComponent),
    },
  ],
})
export class NumberCounterInputComponent implements ControlValueAccessor {
  @Input() value!: number;
  @Input() maxValue: number = 0;
  @Input() minValue: number = 100;
  @Input() count: number = 1;
  @Input() inputType: string = "number";
  @Output() valueChange = new EventEmitter<number>();

  onChange: any = () => {};
  onTouched: any = () => {};
  protected touched = false;
  protected disabled = false;

  onChangeValue(newValue: number): void {
    if (newValue > this.maxValue) {
      this.value = this.maxValue;
    } else if (newValue < this.minValue) {
      this.value = this.minValue;
    } else {
      this.value = newValue;
    }
    this.onChange(this.value);
    this.valueChange.emit(this.value);
  }

  add(): void {
    this.markAsTouched();
    if (!this.disabled && Number(this.value) + this.count <= this.maxValue) {
      this.value = parseInt(this.value.toString(), 10) + this.count;
      this.onChange(this.value);
      this.valueChange.emit(this.value);
    }
  }

  remove(): void {
    this.markAsTouched();
    if (!this.disabled && Number(this.value) - this.count >= this.minValue) {
      this.value = parseInt(this.value.toString(), 10) - this.count;
      this.onChange(this.value);
      this.valueChange.emit(this.value);
    }
  }

  writeValue(value: number): void {
    if (value > this.maxValue) {
      this.value = this.maxValue;
    } else if (value < this.minValue) {
      this.value = this.minValue;
    } else {
      this.value = value;
    }
    this.valueChange.emit(this.value);
  }

  registerOnChange(onChange: (value: number) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: () => void): void {
    this.onTouched = onTouched;
  }

  markAsTouched(): void {
    if (!this.touched) {
      this.onTouched();
      this.touched = true;
    }
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
  }
}
