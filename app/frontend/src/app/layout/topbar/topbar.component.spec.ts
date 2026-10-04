import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { TranslocoTestingModule, TranslocoService } from '@jsverse/transloco';
import { Subject } from 'rxjs';

import { TopbarComponent } from './topbar.component';
import { LanguageChangeService } from '@core/services/language-change.service';
import { AuthService } from '@core/services/auth/auth.service';

describe('TopbarComponent', () => {
  let component: TopbarComponent;
  let fixture: ComponentFixture<TopbarComponent>;
  let routerEvents: Subject<unknown>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let navigateSpy: jasmine.Spy;
  let languageChangeService: LanguageChangeService;

  beforeEach(async () => {
    routerEvents = new Subject<unknown>();
    authServiceSpy = jasmine.createSpyObj('AuthService', ['logout']);
    navigateSpy = jasmine.createSpy('navigate');

    await TestBed.configureTestingModule({
      declarations: [TopbarComponent],
      imports: [
        CommonModule,
        TranslocoTestingModule.forRoot({
          langs: { en: {}, th: {} },
          translocoConfig: { availableLangs: ['en', 'th'], defaultLang: 'en' },
        }),
      ],
      providers: [
        { provide: Router, useValue: { events: routerEvents.asObservable(), navigate: navigateSpy } },
        { provide: AuthService, useValue: authServiceSpy },
        LanguageChangeService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    localStorage.removeItem('lang');
    fixture = TestBed.createComponent(TopbarComponent);
    component = fixture.componentInstance;
    languageChangeService = TestBed.inject(LanguageChangeService);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('lang');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit() sets the active language from localStorage, defaulting when unset', () => {
    const transloco = TestBed.inject(TranslocoService);
    expect(transloco.getActiveLang()).toBe('en');
  });

  it('ngOnInit() subscribes to router NavigationEnd and tracks the current URL', () => {
    routerEvents.next(new NavigationEnd(1, '/users/configurations/upload', '/users/configurations/upload'));
    expect(component.currentUrl).toBe('/users/configurations/upload');
  });

  it('setActive()/isActive() track the active route', () => {
    expect(component.isActive('experiments')).toBeFalse();
    component.setActive('experiments');
    expect(component.isActive('experiments')).toBeTrue();
    expect(component.isActive('configurations')).toBeFalse();
  });

  it('isInConfigurations() reflects whether the current URL is under /users/configurations', () => {
    expect(component.isInConfigurations()).toBeFalse();
    routerEvents.next(new NavigationEnd(1, '/users/configurations/upload', '/users/configurations/upload'));
    expect(component.isInConfigurations()).toBeTrue();
  });

  describe('toggleLang()', () => {
    it('sets the active language, persists it, and notifies the language-change service', () => {
      const transloco = TestBed.inject(TranslocoService);
      const notifySpy = spyOn(languageChangeService, 'notifyLangToggle');

      component.toggleLang('th');

      expect(transloco.getActiveLang()).toBe('th');
      expect(localStorage.getItem('lang')).toBe('th');
      expect(notifySpy).toHaveBeenCalledTimes(1);
    });
  });

  it('currentLang getter reflects the active transloco language', () => {
    const transloco = TestBed.inject(TranslocoService);
    transloco.setActiveLang('th');
    expect(component.currentLang).toBe('th');
  });

  describe('logout()', () => {
    it('ends the session and opens the login page', () => {
      component.logout();

      expect(authServiceSpy.logout).toHaveBeenCalledTimes(1);
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });
  });
});
