import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { AuthApiService } from './auth-api.service';
import { AuthSession, AuthUser } from '../../models/auth.model';

const USER_KEY = 'currentUser';
const DEMO_OPT_OUT_KEY = 'demoEntryDeclined';

const base64Url = (value: object): string =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function token(expiresInSeconds: number): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url({ userId: 'user-1', exp })}.signature`;
}

function user(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-1',
    username: 'jane',
    firstName: 'Jane',
    lastName: 'Doe',
    name: 'Jane Doe',
    role: 'BRS',
    roles: ['BRS'],
    companyName: 'Acme',
    ...overrides,
  };
}

const session = (expiresInSeconds = 900): AuthSession => ({ user: user(), accessToken: token(expiresInSeconds) });

// How the browser says the page was loaded: 'reload' for a refresh, 'back_forward' for a reopened tab
const loadedBy = (type: NavigationTimingType): void => {
  spyOn(performance, 'getEntriesByType').and.returnValue([{ type }] as unknown as PerformanceEntryList);
};

describe('AuthService', () => {
  let api: jasmine.SpyObj<AuthApiService>;

  function createService(): AuthService {
    TestBed.configureTestingModule({
      providers: [AuthService, { provide: AuthApiService, useValue: api }],
    });
    return TestBed.inject(AuthService);
  }

  beforeEach(() => {
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(DEMO_OPT_OUT_KEY);
    api = jasmine.createSpyObj<AuthApiService>('AuthApiService', ['login', 'register', 'demo', 'refresh', 'logout']);
    api.logout.and.returnValue(of(null));
  });

  afterEach(() => {
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(DEMO_OPT_OUT_KEY);
  });

  describe('initializeAuth()', () => {
    it('finishes without a refresh call when no user is cached', () => {
      const service = createService();
      let initialized = false;
      service.authInitialized$.subscribe((value) => (initialized = value));

      service.initializeAuth().subscribe();

      expect(api.refresh).not.toHaveBeenCalled();
      expect(initialized).toBeTrue();
      expect(service.isLoggedIn).toBeFalse();
    });

    it('restores the session from the refresh cookie when a user is cached', () => {
      localStorage.setItem(USER_KEY, JSON.stringify(user()));
      api.refresh.and.returnValue(of(session()));
      const service = createService();

      service.initializeAuth().subscribe();

      expect(service.hasValidToken()).toBeTrue();
      expect(service.isLoggedIn).toBeTrue();
    });

    it('clears the cached user when the refresh is refused', () => {
      localStorage.setItem(USER_KEY, JSON.stringify(user()));
      api.refresh.and.returnValue(throwError(() => new Error('expired')));
      const service = createService();
      let initialized = false;
      service.authInitialized$.subscribe((value) => (initialized = value));

      service.initializeAuth().subscribe();

      expect(service.getCurrentUser()).toBeNull();
      expect(localStorage.getItem(USER_KEY)).toBeNull();
      expect(initialized).toBeTrue();
    });
  });

  describe('hasValidToken()', () => {
    it('is false before any sign-in', () => {
      expect(createService().hasValidToken()).toBeFalse();
    });

    it('is true for an unexpired token and false for an expired one', () => {
      const service = createService();

      api.login.and.returnValue(of(session(900)));
      service.login('jane', 'secret').subscribe();
      expect(service.hasValidToken()).toBeTrue();

      api.login.and.returnValue(of(session(-60)));
      service.login('jane', 'secret').subscribe();
      expect(service.hasValidToken()).toBeFalse();
    });

    it('is false for a token that is not a JWT', () => {
      const service = createService();
      api.login.and.returnValue(of({ user: user(), accessToken: 'not-a-jwt' }));

      service.login('jane', 'secret').subscribe();

      expect(service.hasValidToken()).toBeFalse();
    });
  });

  it('login() keeps the token in memory and caches only the profile', () => {
    const service = createService();
    const signedIn = session();
    api.login.and.returnValue(of(signedIn));

    service.login('jane', 'secret').subscribe();

    expect(service.getAccessToken()).toBe(signedIn.accessToken);
    expect(service.getCurrentUser()?.name).toBe('Jane Doe');
    const cached = localStorage.getItem(USER_KEY) ?? '';
    expect(JSON.parse(cached).username).toBe('jane');
    expect(cached).not.toContain(signedIn.accessToken);
  });

  it('register() and loginAsDemo() start a session the same way', () => {
    const service = createService();
    api.register.and.returnValue(of(session()));
    api.demo.and.returnValue(of(session()));

    service.register({ username: 'jane', password: 'secret-123', firstName: 'Jane', lastName: 'Doe' }).subscribe();
    expect(service.isLoggedIn).toBeTrue();

    service.clearSession();
    service.loginAsDemo().subscribe();
    expect(service.isLoggedIn).toBeTrue();
  });

  it('hasAnyRole() checks the roles of the signed-in user', () => {
    const service = createService();
    expect(service.hasAnyRole(['BRS'])).toBeFalse();

    api.login.and.returnValue(of(session()));
    service.login('jane', 'secret').subscribe();

    expect(service.hasAnyRole(['BRS'])).toBeTrue();
    expect(service.hasAnyRole(['Admin'])).toBeFalse();
  });

  describe('demo entry', () => {
    it('logout() ends the session and declines the demo entry for this tab', () => {
      const service = createService();
      api.login.and.returnValue(of(session()));
      service.login('jane', 'secret').subscribe();
      expect(service.canEnterAsDemo()).toBeTrue();

      service.logout();

      expect(api.logout).toHaveBeenCalled();
      expect(service.getAccessToken()).toBeNull();
      expect(service.getCurrentUser()).toBeNull();
      expect(service.canEnterAsDemo()).toBeFalse();
    });

    it('a new sign-in allows the demo entry again', () => {
      const service = createService();
      sessionStorage.setItem(DEMO_OPT_OUT_KEY, '1');
      api.login.and.returnValue(of(session()));

      service.login('jane', 'secret').subscribe();

      expect(service.canEnterAsDemo()).toBeTrue();
    });

    it('a refresh of the tab keeps the demo entry declined', () => {
      sessionStorage.setItem(DEMO_OPT_OUT_KEY, '1');
      loadedBy('reload');

      expect(createService().canEnterAsDemo()).toBeFalse();
    });

    it('a tab that is opened again allows the demo entry, even when the browser restores its storage', () => {
      sessionStorage.setItem(DEMO_OPT_OUT_KEY, '1');
      loadedBy('back_forward');

      expect(createService().canEnterAsDemo()).toBeTrue();
      expect(sessionStorage.getItem(DEMO_OPT_OUT_KEY)).toBeNull();
    });
  });
});
