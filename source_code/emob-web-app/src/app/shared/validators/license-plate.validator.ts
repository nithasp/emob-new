import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function licensePlatesValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value && Array.isArray(value) && value.length === 0) {
      return { licensePlatesEmpty: true };
    }
    return null;
  };
} 