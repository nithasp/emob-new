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

export function licensePlateDuplicateValidator(
  existingLicensePlates: string[]
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value?.trim();
    if (value && existingLicensePlates.includes(value)) {
      return { licensePlateDuplicate: true };
    }
    return null;
  };
}
