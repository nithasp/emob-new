import {
  ValidatorFn,
  AbstractControl,
  ValidationErrors,
  FormGroup,
} from '@angular/forms';
import { timeStringToMinutes } from '../pipes/time-string-to-minutes.pipe';
import { TimeRangeValidatorConfig } from '../models/time.model';
import { logWarning } from '@core/services/logger.service';

export function createTimeRangeValidator(
  config: TimeRangeValidatorConfig
): ValidatorFn {
  const {
    startTimeField,
    endTimeField,
    startTimeErrorMessage = 'Start time must be earlier than end time',
    endTimeErrorMessage = 'End time must be later than start time',
    errorKey = 'timeRangeInvalid',
  } = config;

  return (control: AbstractControl): ValidationErrors | null => {
    const formGroup = control as FormGroup;
    const startTimeControl = formGroup.get(startTimeField);
    const endTimeControl = formGroup.get(endTimeField);

    if (!startTimeControl || !endTimeControl) {
      logWarning(
        `TimeRangeValidator: Controls '${startTimeField}' or '${endTimeField}' not found in form`
      );
      return null;
    }

    const startTime = startTimeControl.value;
    const endTime = endTimeControl.value;

    if (startTimeControl.hasError(errorKey)) {
      delete startTimeControl.errors![errorKey];
      if (Object.keys(startTimeControl.errors!).length === 0) {
        startTimeControl.setErrors(null);
      }
    }
    if (endTimeControl.hasError(errorKey)) {
      delete endTimeControl.errors![errorKey];
      if (Object.keys(endTimeControl.errors!).length === 0) {
        endTimeControl.setErrors(null);
      }
    }

    if (!startTime || !endTime) {
      return null;
    }

    const startMinutes = timeStringToMinutes(startTime);
    const endMinutes = timeStringToMinutes(endTime);

    if (startMinutes === null || endMinutes === null) {
      return null;
    }

    if (startMinutes >= endMinutes) {
      const startCurrentErrors = startTimeControl.errors || {};
      startTimeControl.setErrors({
        ...startCurrentErrors,
        [errorKey]: startTimeErrorMessage,
      });

      const endCurrentErrors = endTimeControl.errors || {};
      endTimeControl.setErrors({
        ...endCurrentErrors,
        [errorKey]: endTimeErrorMessage,
      });
    }

    return null;
  };
}

export function compareTimeValidator(
  startTimeErrorMessage?: string,
  endTimeErrorMessage?: string
): ValidatorFn {
  return createTimeRangeValidator({
    startTimeField: 'twEarly',
    endTimeField: 'twLate',
    startTimeErrorMessage,
    endTimeErrorMessage,
  });
}

export function createStartEndTimeValidator(
  startTimeErrorMessage?: string,
  endTimeErrorMessage?: string
): ValidatorFn {
  return createTimeRangeValidator({
    startTimeField: 'startTime',
    endTimeField: 'endTime',
    startTimeErrorMessage,
    endTimeErrorMessage,
  });
}
