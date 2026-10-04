import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AuthSession, AuthUser, RegisterRequest } from '../models/auth.model';
import { AuthApiService } from './auth-api.service';

const USER_KEY = 'currentUser';
const DEMO_OPT_OUT_KEY = 'demoEntryDeclined';

/**
 * JWT segments are base64url: `-` and `_` stand in for `+` and `/`, and the `=` padding is
 * dropped. `atob` rejects both, so a plain `atob(segment)` throws on any token whose bytes happen
 * to encode one of those characters — which reads as "expired" and forces a needless refresh.
 */
function decodeJwtSegment(segment: string): Record<string, unknown> {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return JSON.parse(atob(padded)) as Record<string, unknown>;
}

/**
 * A browser brings sessionStorage back when it reopens or restores a closed tab, so the storage
 * alone cannot tell a tab that was refreshed from one that was opened again.
 */
function isTabRefresh(): boolean {
  return performance
    .getEntriesByType('navigation')
    .some((entry) => (entry as PerformanceNavigationTiming).type === 'reload');
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  /**
   * The access token is kept in memory only. The session itself lives in an HttpOnly cookie that
   * JavaScript cannot read, so a script injected into the page cannot walk off with it.
   */
  private accessToken: string | null = null;

  private readonly loggedInSubject = new BehaviorSubject<boolean>(false);
  readonly isLoggedIn$ = this.loggedInSubject.asObservable();

  private readonly currentUserSubject = new BehaviorSubject<AuthUser | null>(this.getCachedUser());
  readonly currentUser$ = this.currentUserSubject.asObservable();

  private readonly initializedSubject = new BehaviorSubject<boolean>(false);
  readonly authInitialized$ = this.initializedSubject.asObservable();

  constructor(private readonly authApi: AuthApiService) {
    // Signing out keeps the login page through a refresh; a tab that is opened again is a new visit
    if (!isTabRefresh()) {
      sessionStorage.removeItem(DEMO_OPT_OUT_KEY);
    }
  }

  /** The cached profile only says whether a session is worth asking about; the server decides. */
  initializeAuth(): Observable<void> {
    if (!this.getCachedUser()) {
      this.loggedInSubject.next(false);
      this.initializedSubject.next(true);
      return of(undefined);
    }

    return this.authApi.refresh().pipe(
      tap((session) => this.storeSession(session)),
      map(() => undefined),
      catchError(() => {
        this.clearSession();
        return of(undefined);
      }),
      tap(() => this.initializedSubject.next(true)),
    );
  }

  hasValidToken(): boolean {
    const token = this.accessToken;
    if (!token) return false;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const header = decodeJwtSegment(parts[0]);
      if (!header['alg'] || !header['typ']) return false;
      const exp = decodeJwtSegment(parts[1])['exp'];
      return typeof exp === 'number' && exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  private getCachedUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.getValue();
  }

  get isLoggedIn(): boolean {
    return this.loggedInSubject.getValue();
  }

  /** Decides what the app shows; the API checks the account on its own for every request. */
  hasAnyRole(expectedRoles: string[]): boolean {
    const roles = this.getCurrentUser()?.roles ?? [];
    return expectedRoles.some((role) => roles.includes(role));
  }

  /**
   * A visitor with no session is let in as the demo account, unless they signed out in this tab:
   * a sign-out that walked straight back in would not be one.
   */
  canEnterAsDemo(): boolean {
    return environment.auth.autoDemoLogin && sessionStorage.getItem(DEMO_OPT_OUT_KEY) === null;
  }

  private cacheUser(user: AuthUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private storeSession(session: AuthSession): void {
    this.accessToken = session.accessToken;
    this.cacheUser(session.user);
    this.loggedInSubject.next(true);
    sessionStorage.removeItem(DEMO_OPT_OUT_KEY);
  }

  register(request: RegisterRequest): Observable<AuthSession> {
    return this.authApi.register(request).pipe(tap((session) => this.storeSession(session)));
  }

  login(username: string, password: string): Observable<AuthSession> {
    return this.authApi.login(username, password).pipe(tap((session) => this.storeSession(session)));
  }

  loginAsDemo(): Observable<AuthSession> {
    return this.authApi.demo().pipe(tap((session) => this.storeSession(session)));
  }

  refreshAccessToken(): Observable<AuthSession> {
    return this.authApi.refresh().pipe(tap((session) => this.storeSession(session)));
  }

  logout(): void {
    this.authApi.logout().subscribe({ error: () => {} });
    // Declined first: clearing the session starts the navigation that asks whether to enter the demo
    sessionStorage.setItem(DEMO_OPT_OUT_KEY, '1');
    this.clearSession();
  }

  clearSession(): void {
    this.accessToken = null;
    localStorage.removeItem(USER_KEY);
    this.loggedInSubject.next(false);
    this.currentUserSubject.next(null);
  }
}
