import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '@core/services/auth/auth.service';
import { environment } from '@env/environment';
import { applySavedLanguage, authErrorMessage, switchLanguage } from '../auth-page.utils';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly transloco = inject(TranslocoService);
  private readonly spinner = inject(NgxSpinnerService);

  readonly demoEnabled = environment.auth.autoDemoLogin;
  isLoading = false;
  isDemoLoading = false;
  showPassword = false;

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

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

  isInvalid(field: 'username' | 'password'): boolean {
    const control = this.form.controls[field];
    return control.invalid && control.touched;
  }

  onSubmit(): void {
    // A disabled form reports status DISABLED rather than INVALID, so the check below would
    // let a second submit through while the first is still in flight
    if (this.isLoading || this.isDemoLoading) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.form.disable();
    const { username, password } = this.form.getRawValue();

    this.authService.login(username.trim(), password).subscribe({
      next: (session) => {
        this.toastr.success(session.user.name, this.transloco.translate('auth.welcome_back'));
        this.router.navigate(['/users']);
      },
      error: (err: unknown) => {
        this.toastr.error(authErrorMessage(err, this.transloco.translate('auth.login_failed')));
        this.isLoading = false;
        this.form.enable();
      },
    });
  }

  enterDemo(): void {
    if (this.isLoading || this.isDemoLoading) return;
    this.isDemoLoading = true;

    this.authService.loginAsDemo().subscribe({
      next: () => this.router.navigate(['/users']),
      error: (err: unknown) => {
        this.toastr.error(authErrorMessage(err, this.transloco.translate('auth.demo_unavailable')));
        this.isDemoLoading = false;
      },
    });
  }
}
