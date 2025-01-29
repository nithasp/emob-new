import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-number-counter-input',
  templateUrl: './number-counter-input.component.html',
  styleUrl: './number-counter-input.component.scss',
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


  onChange = (value: any) => {};
  onTouched = () => {};
  protected touched = false;
  protected disabled = false;

  valueChanged(): void {
    this.onChange(this.value);
  }

  add(): void {
    this.markAsTouched();
    if (!this.disabled && Number(this.value)+ this.count <= this.maxValue) {
      this.value = parseInt(this.value.toString(), 10) + this.count;
      if(this.inputType == "text"){
        this.onChange(String(this.value));
      }else this.onChange(this.value);
    }
  }

  remove(): void {
    this.markAsTouched();
    if (!this.disabled && Number(this.value)- this.count >= this.minValue) {
      this.value = parseInt(this.value.toString(), 10) - this.count;
      if(this.inputType == "text"){
        this.onChange(String(this.value));
      }else this.onChange(this.value);
    }
  }

  writeValue(value: number) {
    this.value = value;
  }

  registerOnChange(onChange: (value: number) => void) {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: () => void) {
    this.onTouched = onTouched;
  }

  markAsTouched() {
    if (!this.touched) {
      this.onTouched();
      this.touched = true;
    }
  }

  setDisabledState(disabled: boolean) {
    this.disabled = disabled;
  }
}
