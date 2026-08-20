import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { MSAL_GUARD_CONFIG, MsalService } from '@azure/msal-angular';
import { AccountInfo, InteractionType } from '@azure/msal-browser';
import { TranslocoTestingModule, TranslocoService } from '@jsverse/transloco';
import { Subject } from 'rxjs';

import { TopbarComponent } from './topbar.component';
import { LanguageChangeService } from 'src/app/services/language-change.service';

describe('TopbarComponent', () => {
  let component: TopbarComponent;
  let fixture: ComponentFixture<TopbarComponent>;
  let routerEvents: Subject<unknown>;
  let authServiceSpy: jasmine.SpyObj<MsalService>;
  let instanceSpy: jasmine.SpyObj<{ getActiveAccount: () => unknown }>;
  let languageChangeService: LanguageChangeService;
  let msalGuardConfig: { interactionType: InteractionType };

  beforeEach(async () => {
    routerEvents = new Subject<unknown>();
    instanceSpy = jasmine.createSpyObj('PublicClientApplication', ['getActiveAccount']);
    authServiceSpy = jasmine.createSpyObj('MsalService', ['logoutPopup', 'logoutRedirect'], {
      instance: instanceSpy,
    });
    msalGuardConfig = { interactionType: InteractionType.Popup };

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
        { provide: Router, useValue: { events: routerEvents.asObservable() } },
        { provide: MSAL_GUARD_CONFIG, useValue: msalGuardConfig },
        { provide: MsalService, useValue: authServiceSpy },
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
    it('uses logoutPopup when the guard config is configured for popup interaction', () => {
      msalGuardConfig.interactionType = InteractionType.Popup;
      const account = { username: 'user@test.com' } as unknown as AccountInfo;
      instanceSpy.getActiveAccount.and.returnValue(account);

      component.logout();

      expect(authServiceSpy.logoutPopup).toHaveBeenCalledWith({ account });
      expect(authServiceSpy.logoutRedirect).not.toHaveBeenCalled();
    });

    it('uses logoutRedirect when the guard config is not configured for popup interaction', () => {
      msalGuardConfig.interactionType = InteractionType.Redirect;
      instanceSpy.getActiveAccount.and.returnValue(null);

      component.logout();

      expect(authServiceSpy.logoutRedirect).toHaveBeenCalledWith({ account: null });
      expect(authServiceSpy.logoutPopup).not.toHaveBeenCalled();
    });
  });
});
