import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { AppComponent } from './app.component';
import { AuthService } from '@core/services/auth/auth.service';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['initializeAuth']);
    authService.initializeAuth.and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      providers: [{ provide: AuthService, useValue: authService }],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(AppComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit() restores the session once', () => {
    fixture.detectChanges();
    expect(authService.initializeAuth).toHaveBeenCalledTimes(1);
  });
});
