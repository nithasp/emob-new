import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { TranslocoService } from '@jsverse/transloco';

/** The API explains a refused sign-in or registration in the response body. */
export function authErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return fallback;
    }
    const message: unknown = error.error?.message;
    return typeof message === 'string' && message ? message : fallback;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

export function passwordsMatch(passwordField: string, confirmField: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get(passwordField)?.value;
    const confirm = group.get(confirmField)?.value;
    return password && confirm && password !== confirm ? { mismatch: true } : null;
  };
}

/** The language picked on an earlier visit; the top bar applies the same key once signed in. */
export function applySavedLanguage(transloco: TranslocoService): void {
  const saved = localStorage.getItem('lang');
  if (saved === 'en' || saved === 'th') {
    transloco.setActiveLang(saved);
  }
}

export function switchLanguage(transloco: TranslocoService, lang: 'en' | 'th'): void {
  transloco.setActiveLang(lang);
  localStorage.setItem('lang', lang);
}
