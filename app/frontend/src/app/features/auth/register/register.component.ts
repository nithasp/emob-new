import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { RegisterField } from 'src/app/models/auth.model';
import { AuthService } from 'src/app/services/auth.service';
import { applySavedLanguage, authErrorMessage, passwordsMatch, switchLanguage } from '../auth-page.utils';

// The same rules the API applies, so a rejected value is caught before the request is sent
const USERNAME_PATTERN = /^[\p{L}\p{N}._@+-]+$/u;
const MIN_USERNAME_LENGTH = 3;
const MIN_PASSWORD_LENGTH = 8;

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly transloco = inject(TranslocoService);
  private readonly spinner = inject(NgxSpinnerService);

  isLoading = false;
  showPassword = false;

  readonly form = this.fb.nonNullable.group(
    {
      firstName: ['', [Validators.required, Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.maxLength(100)]],
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(MIN_USERNAME_LENGTH),
          Validators.maxLength(100),
          Validators.pattern(USERNAME_PATTERN),
        ],
      ],
      password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH), Validators.maxLength(128)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch('password', 'confirmPassword') },
  );

  ngOnInit(): void {
    this.spinner.hide();
    applySavedLanguage(this.transloco);
  }

  get currentLang(): string {
    return this.transloco.getActiveLang();
  }

  toggleLang(lang: 'en' | 'th'): void {
    switchLanguage(this.transloco, lang);
  }

  isInvalid(field: RegisterField): boolean {
    const control = this.form.controls[field];
    const mismatch = field === 'confirmPassword' && this.form.hasError('mismatch');
    return (control.invalid || mismatch) && control.touched;
  }

  /** Translation key of the first problem with a field, shown under it. */
  errorKey(field: RegisterField): string {
    const errors = this.form.controls[field].errors;
    if (errors?.['required']) return 'error_required';
    if (errors?.['minlength']) return field === 'username' ? 'error_username_min' : 'error_password_min';
    if (errors?.['pattern']) return 'error_username_pattern';
    if (errors?.['maxlength']) return 'error_too_long';
    return 'error_password_mismatch';
  }

  onSubmit(): void {
    // A disabled form reports status DISABLED rather than INVALID, so the check below would
    // let a second submit through while the first is still in flight
    if (this.isLoading) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.form.disable();
    const { firstName, lastName, username, password } = this.form.getRawValue();

    this.authService
      .register({ firstName: firstName.trim(), lastName: lastName.trim(), username: username.trim(), password })
      .subscribe({
        next: (session) => {
          this.toastr.success(session.user.name, this.transloco.translate('auth.welcome'));
          this.router.navigate(['/users']);
        },
        error: (err: unknown) => {
          this.toastr.error(authErrorMessage(err, this.transloco.translate('auth.register_failed')));
          this.isLoading = false;
          this.form.enable();
        },
      });
  }
}
