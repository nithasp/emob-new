import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { BehaviorSubject, firstValueFrom, of, throwError } from 'rxjs';

import { RoleGuard } from './role.guard';
import { GuestGuard } from './guest.guard';
import { AuthService } from '../services/auth/auth.service';
import { AuthSession, AuthUser } from '../models/auth.model';

const USER = { id: 'user-1', roles: ['BRS'] } as AuthUser;
const SESSION = { user: USER, accessToken: 'token' } as AuthSession;

function setup() {
  const initialized$ = new BehaviorSubject<boolean>(true);
  const authService = jasmine.createSpyObj<AuthService>(
    'AuthService',
    ['hasValidToken', 'getCurrentUser', 'refreshAccessToken', 'canEnterAsDemo', 'loginAsDemo', 'clearSession', 'hasAnyRole'],
    { authInitialized$: initialized$.asObservable() },
  );
  authService.hasValidToken.and.returnValue(false);
  authService.getCurrentUser.and.returnValue(null);
  authService.canEnterAsDemo.and.returnValue(false);
  authService.hasAnyRole.and.returnValue(true);

  const router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
  router.createUrlTree.and.callFake((commands: unknown[]) => commands.join('') as unknown as UrlTree);

  TestBed.configureTestingModule({
    providers: [RoleGuard, GuestGuard, { provide: AuthService, useValue: authService }, { provide: Router, useValue: router }],
  });
  return { authService, initialized$ };
}

const route = (expectedRoles?: string[]) =>
  ({ data: expectedRoles ? { expectedRoles } : {} }) as unknown as ActivatedRouteSnapshot;

describe('RoleGuard', () => {
  const activate = (expectedRoles?: string[]) =>
    firstValueFrom(TestBed.inject(RoleGuard).canActivate(route(expectedRoles))) as Promise<unknown>;

  it('lets a signed-in user with the expected role through', async () => {
    const { authService } = setup();
    authService.hasValidToken.and.returnValue(true);

    expect(await activate(['BRS'])).toBeTrue();
    expect(authService.hasAnyRole).toHaveBeenCalledWith(['BRS']);
  });

  it('sends a signed-in user without the role to /unauthorized', async () => {
    const { authService } = setup();
    authService.hasValidToken.and.returnValue(true);
    authService.hasAnyRole.and.returnValue(false);

    expect(await activate(['Admin'])).toBe('/unauthorized');
  });

  it('renews the session of a returning user from the refresh cookie', async () => {
    const { authService } = setup();
    authService.getCurrentUser.and.returnValue(USER);
    authService.refreshAccessToken.and.returnValue(of(SESSION));

    expect(await activate(['BRS'])).toBeTrue();
    expect(authService.loginAsDemo).not.toHaveBeenCalled();
  });

  it('lets a visitor with no session in as the demo account when that is enabled', async () => {
    const { authService } = setup();
    authService.canEnterAsDemo.and.returnValue(true);
    authService.loginAsDemo.and.returnValue(of(SESSION));

    expect(await activate(['BRS'])).toBeTrue();
    expect(authService.loginAsDemo).toHaveBeenCalledTimes(1);
  });

  it('falls back to the demo account when a stale session cannot be renewed', async () => {
    const { authService } = setup();
    authService.getCurrentUser.and.returnValue(USER);
    authService.refreshAccessToken.and.returnValue(throwError(() => new Error('expired')));
    authService.canEnterAsDemo.and.returnValue(true);
    authService.loginAsDemo.and.returnValue(of(SESSION));

    expect(await activate(['BRS'])).toBeTrue();
  });

  it('sends a visitor to /login when the demo entry is off or was declined', async () => {
    const { authService } = setup();

    expect(await activate(['BRS'])).toBe('/login');
    expect(authService.loginAsDemo).not.toHaveBeenCalled();
    expect(authService.clearSession).toHaveBeenCalled();
  });

  it('sends a visitor to /login when the demo sign-in fails', async () => {
    const { authService } = setup();
    authService.canEnterAsDemo.and.returnValue(true);
    authService.loginAsDemo.and.returnValue(throwError(() => new Error('not available')));

    expect(await activate(['BRS'])).toBe('/login');
  });

  it('waits for the session to be restored before deciding', async () => {
    const { authService, initialized$ } = setup();
    initialized$.next(false);
    authService.hasValidToken.and.returnValue(true);

    const pending = activate(['BRS']);
    expect(authService.hasValidToken).not.toHaveBeenCalled();

    initialized$.next(true);
    expect(await pending).toBeTrue();
  });
});

describe('GuestGuard', () => {
  const activate = () => firstValueFrom(TestBed.inject(GuestGuard).canActivate()) as Promise<unknown>;

  it('shows the page to a visitor with no session when the demo entry is off or was declined', async () => {
    const { authService } = setup();

    expect(await activate()).toBeTrue();
    expect(authService.loginAsDemo).not.toHaveBeenCalled();
    expect(authService.clearSession).not.toHaveBeenCalled();
  });

  it('sends a visitor with no session into the app as the demo account when that is enabled', async () => {
    const { authService } = setup();
    authService.canEnterAsDemo.and.returnValue(true);
    authService.loginAsDemo.and.returnValue(of(SESSION));

    expect(await activate()).toBe('/users');
    expect(authService.loginAsDemo).toHaveBeenCalledTimes(1);
  });

  it('falls back to the demo account when a stale session cannot be renewed', async () => {
    const { authService } = setup();
    authService.getCurrentUser.and.returnValue(USER);
    authService.refreshAccessToken.and.returnValue(throwError(() => new Error('expired')));
    authService.canEnterAsDemo.and.returnValue(true);
    authService.loginAsDemo.and.returnValue(of(SESSION));

    expect(await activate()).toBe('/users');
    expect(authService.clearSession).toHaveBeenCalledTimes(1);
  });

  it('shows the page when the demo sign-in fails', async () => {
    const { authService } = setup();
    authService.canEnterAsDemo.and.returnValue(true);
    authService.loginAsDemo.and.returnValue(throwError(() => new Error('not available')));

    expect(await activate()).toBeTrue();
    expect(authService.clearSession).not.toHaveBeenCalled();
  });

  it('sends a signed-in user to the app', async () => {
    const { authService } = setup();
    authService.hasValidToken.and.returnValue(true);

    expect(await activate()).toBe('/users');
  });

  it('renews a returning user and sends them to the app', async () => {
    const { authService } = setup();
    authService.getCurrentUser.and.returnValue(USER);
    authService.refreshAccessToken.and.returnValue(of(SESSION));

    expect(await activate()).toBe('/users');
  });

  it('shows the page when a stale session cannot be renewed', async () => {
    const { authService } = setup();
    authService.getCurrentUser.and.returnValue(USER);
    authService.refreshAccessToken.and.returnValue(throwError(() => new Error('expired')));

    expect(await activate()).toBeTrue();
    expect(authService.clearSession).toHaveBeenCalled();
  });
});
