import { HttpErrorResponse } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { Subject, of, throwError } from 'rxjs';

import { LoginComponent } from './login.component';
import { RegisterComponent } from '../register/register.component';
import { AuthService } from '@core/services/auth/auth.service';
import { AuthSession } from '@core/models/auth.model';

const SESSION = { user: { name: 'Jane Doe' }, accessToken: 'token' } as AuthSession;

function configure() {
  const authService = jasmine.createSpyObj<AuthService>('AuthService', ['login', 'loginAsDemo', 'register']);
  const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
  const toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
  const spinner = jasmine.createSpyObj<NgxSpinnerService>('NgxSpinnerService', ['hide']);

  TestBed.configureTestingModule({
    declarations: [LoginComponent, RegisterComponent],
    imports: [
      ReactiveFormsModule,
      TranslocoTestingModule.forRoot({
        langs: { en: {}, th: {} },
        translocoConfig: { availableLangs: ['en', 'th'], defaultLang: 'en' },
      }),
    ],
    providers: [
      { provide: AuthService, useValue: authService },
      { provide: Router, useValue: router },
      { provide: ToastrService, useValue: toastr },
      { provide: NgxSpinnerService, useValue: spinner },
    ],
    schemas: [NO_ERRORS_SCHEMA],
  })
    .overrideComponent(LoginComponent, { set: { template: '' } })
    .overrideComponent(RegisterComponent, { set: { template: '' } });

  return { authService, router, toastr, spinner };
}

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mocks: ReturnType<typeof configure>;

  beforeEach(() => {
    localStorage.removeItem('lang');
    mocks = configure();
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.removeItem('lang'));

  it('hides a spinner left up by the page that redirected here', () => {
    expect(mocks.spinner.hide).toHaveBeenCalled();
  });

  it('does not call the API while a field is empty', () => {
    component.onSubmit();

    expect(mocks.authService.login).not.toHaveBeenCalled();
    expect(component.isInvalid('username')).toBeTrue();
    expect(component.isInvalid('password')).toBeTrue();
  });

  it('signs in and opens the app', () => {
    mocks.authService.login.and.returnValue(of(SESSION));
    component.form.setValue({ username: '  jane ', password: 'secret-123' });

    component.onSubmit();

    expect(mocks.authService.login).toHaveBeenCalledWith('jane', 'secret-123');
    expect(mocks.router.navigate).toHaveBeenCalledWith(['/users']);
  });

  it('shows the reason the API gives and lets the user try again', () => {
    mocks.authService.login.and.returnValue(throwError(() => new Error('Invalid username or password')));
    component.form.setValue({ username: 'jane', password: 'wrong' });

    component.onSubmit();

    expect(mocks.toastr.error).toHaveBeenCalledWith('Invalid username or password');
    expect(component.isLoading).toBeFalse();
    expect(component.form.enabled).toBeTrue();
    expect(mocks.router.navigate).not.toHaveBeenCalled();
  });

  it('reads the message out of an HTTP error body', () => {
    mocks.authService.login.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 429, error: { message: 'Too many attempts.' } })),
    );
    component.form.setValue({ username: 'jane', password: 'secret-123' });

    component.onSubmit();

    expect(mocks.toastr.error).toHaveBeenCalledWith('Too many attempts.');
  });

  it('ignores a second submit while the first is still in flight', () => {
    const pending = new Subject<AuthSession>();
    mocks.authService.login.and.returnValue(pending.asObservable());
    component.form.setValue({ username: 'jane', password: 'secret-123' });

    component.onSubmit();
    component.onSubmit();

    expect(mocks.authService.login).toHaveBeenCalledTimes(1);
  });

  it('enterDemo() signs in as the demo account and opens the app', () => {
    mocks.authService.loginAsDemo.and.returnValue(of(SESSION));

    component.enterDemo();

    expect(mocks.authService.loginAsDemo).toHaveBeenCalledTimes(1);
    expect(mocks.router.navigate).toHaveBeenCalledWith(['/users']);
  });

  it('enterDemo() reports when demo access is switched off', () => {
    mocks.authService.loginAsDemo.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404, error: { message: 'Demo access is not available' } })),
    );

    component.enterDemo();

    expect(mocks.toastr.error).toHaveBeenCalledWith('Demo access is not available');
    expect(component.isDemoLoading).toBeFalse();
  });

  it('toggleLang() switches the language and remembers it', () => {
    component.toggleLang('th');

    expect(component.currentLang).toBe('th');
    expect(localStorage.getItem('lang')).toBe('th');
  });
});

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let mocks: ReturnType<typeof configure>;

  const VALID = {
    firstName: ' Jane ',
    lastName: 'Doe',
    username: 'jane.doe',
    password: 'secret-123',
    confirmPassword: 'secret-123',
  };

  beforeEach(() => {
    mocks = configure();
    const fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('does not call the API while the form is incomplete', () => {
    component.onSubmit();

    expect(mocks.authService.register).not.toHaveBeenCalled();
    expect(component.errorKey('firstName')).toBe('error_required');
  });

  it('names the rule a field breaks', () => {
    component.form.patchValue({ username: 'ab', password: 'short', confirmPassword: 'other' });
    component.form.markAllAsTouched();

    expect(component.errorKey('username')).toBe('error_username_min');
    expect(component.errorKey('password')).toBe('error_password_min');
    expect(component.isInvalid('confirmPassword')).toBeTrue();
    expect(component.errorKey('confirmPassword')).toBe('error_password_mismatch');

    component.form.patchValue({ username: 'jane doe!' });
    expect(component.errorKey('username')).toBe('error_username_pattern');
  });

  it('creates the account with trimmed values and opens the app', () => {
    mocks.authService.register.and.returnValue(of(SESSION));
    component.form.setValue(VALID);

    component.onSubmit();

    expect(mocks.authService.register).toHaveBeenCalledWith({
      firstName: 'Jane',
      lastName: 'Doe',
      username: 'jane.doe',
      password: 'secret-123',
    });
    expect(mocks.router.navigate).toHaveBeenCalledWith(['/users']);
  });

  it('shows why the account could not be created and lets the user try again', () => {
    mocks.authService.register.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Username already exists' } })),
    );
    component.form.setValue(VALID);

    component.onSubmit();

    expect(mocks.toastr.error).toHaveBeenCalledWith('Username already exists');
    expect(component.isLoading).toBeFalse();
    expect(component.form.enabled).toBeTrue();
  });
});
