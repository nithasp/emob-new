import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import {
  MSAL_GUARD_CONFIG,
  MsalBroadcastService,
  MsalGuardConfiguration,
  MsalService,
} from '@azure/msal-angular';
import {
  AccountInfo,
  AuthenticationResult,
  EventMessage,
  EventType,
  InteractionStatus,
  InteractionType,
} from '@azure/msal-browser';
import { Subject, of } from 'rxjs';

import { IndexComponent } from './index.component';

function account(overrides: Partial<AccountInfo> = {}): AccountInfo {
  return {
    homeAccountId: 'home-1',
    environment: 'login.windows.net',
    tenantId: 'tenant-1',
    username: 'user@test.com',
    localAccountId: 'local-1',
    name: 'Test User',
    ...overrides,
  } as AccountInfo;
}

describe('IndexComponent', () => {
  let component: IndexComponent;
  let fixture: ComponentFixture<IndexComponent>;
  let authServiceSpy: jasmine.SpyObj<MsalService>;
  let instanceSpy: jasmine.SpyObj<{
    getActiveAccount: () => AccountInfo | null;
    getAllAccounts: () => AccountInfo[];
    setActiveAccount: (account: AccountInfo) => void;
    enableAccountStorageEvents: () => void;
  }>;
  let msalSubject$: Subject<EventMessage>;
  let inProgress$: Subject<InteractionStatus>;

  beforeEach(async () => {
    instanceSpy = jasmine.createSpyObj('PublicClientApplication', [
      'getActiveAccount',
      'getAllAccounts',
      'setActiveAccount',
      'enableAccountStorageEvents',
    ]);
    instanceSpy.getActiveAccount.and.returnValue(null);
    instanceSpy.getAllAccounts.and.returnValue([]);

    authServiceSpy = jasmine.createSpyObj('MsalService', ['handleRedirectObservable'], {
      instance: instanceSpy,
    });
    authServiceSpy.handleRedirectObservable.and.returnValue(
      of(null as unknown as AuthenticationResult)
    );

    msalSubject$ = new Subject<EventMessage>();
    inProgress$ = new Subject<InteractionStatus>();

    await TestBed.configureTestingModule({
      declarations: [IndexComponent],
      providers: [
        {
          provide: MSAL_GUARD_CONFIG,
          useValue: { interactionType: InteractionType.Popup } as MsalGuardConfiguration,
        },
        { provide: MsalService, useValue: authServiceSpy },
        {
          provide: MsalBroadcastService,
          useValue: { msalSubject$: msalSubject$.asObservable(), inProgress$: inProgress$.asObservable() },
        },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(IndexComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('ngOnInit() handles the redirect observable and enables account storage events', () => {
    fixture.detectChanges();
    expect(authServiceSpy.handleRedirectObservable).toHaveBeenCalled();
    expect(instanceSpy.enableAccountStorageEvents).toHaveBeenCalled();
  });

  it('ngOnInit() calls setLoginDisplay(), populating userADProfile from the active account', () => {
    instanceSpy.getActiveAccount.and.returnValue(account({ name: 'Jane Doe', tenantId: 't-1', username: 'jane@test.com' }));

    fixture.detectChanges();

    expect(component.userADProfile).toEqual({
      name: 'Jane Doe',
      tenantId: 't-1',
      username: 'jane@test.com',
    });
  });

  it('setLoginDisplay() falls back to nulls when there is no active account', () => {
    instanceSpy.getActiveAccount.and.returnValue(null);

    fixture.detectChanges();

    expect(component.userADProfile).toEqual({ name: null, tenantId: null, username: null });
  });

  describe('msalSubject$ (ACCOUNT_ADDED / ACCOUNT_REMOVED)', () => {
    // The zero-accounts branch drives window.location.pathname directly, which
    // would navigate the Karma runner itself, so it is intentionally not exercised here.
    it('refreshes the login display when accounts remain', () => {
      fixture.detectChanges();
      instanceSpy.getAllAccounts.and.returnValue([account()]);
      instanceSpy.getActiveAccount.and.returnValue(account({ name: 'Refreshed' }));

      msalSubject$.next({ eventType: EventType.ACCOUNT_REMOVED } as EventMessage);

      expect(component.userADProfile.name).toBe('Refreshed');
    });

    it('ignores unrelated event types', () => {
      fixture.detectChanges();
      const setLoginDisplaySpy = spyOn(component, 'setLoginDisplay');

      msalSubject$.next({ eventType: EventType.LOGIN_SUCCESS } as EventMessage);

      expect(setLoginDisplaySpy).not.toHaveBeenCalled();
    });
  });

  describe('inProgress$ (InteractionStatus.None)', () => {
    it('refreshes login display and sets an active account once interaction settles', () => {
      fixture.detectChanges();
      instanceSpy.getActiveAccount.and.returnValue(null);
      const activeAccount = account({ name: 'Auto Selected' });
      instanceSpy.getAllAccounts.and.returnValue([activeAccount]);

      inProgress$.next(InteractionStatus.None);

      expect(instanceSpy.setActiveAccount).toHaveBeenCalledWith(activeAccount);
    });

    it('does not override an already-active account', () => {
      fixture.detectChanges();
      const activeAccount = account({ name: 'Already Active' });
      instanceSpy.getActiveAccount.and.returnValue(activeAccount);
      instanceSpy.getAllAccounts.and.returnValue([activeAccount, account({ homeAccountId: 'home-2' })]);

      inProgress$.next(InteractionStatus.None);

      expect(instanceSpy.setActiveAccount).not.toHaveBeenCalled();
    });

    it('ignores statuses other than None', () => {
      fixture.detectChanges();
      const checkSpy = spyOn(component, 'checkAndSetActiveAccount');

      inProgress$.next(InteractionStatus.Login);

      expect(checkSpy).not.toHaveBeenCalled();
    });

    it('stops reacting after ngOnDestroy()', () => {
      fixture.detectChanges();
      const checkSpy = spyOn(component, 'checkAndSetActiveAccount');

      component.ngOnDestroy();
      inProgress$.next(InteractionStatus.None);

      expect(checkSpy).not.toHaveBeenCalled();
    });
  });
});
