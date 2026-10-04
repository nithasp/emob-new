import { HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { TokenRefreshService } from '../services/token-refresh.service';

const GRAPHQL = '/api/v1/graphql';
const EXPIRED = { status: 401, message: 'Access token has expired.', data: null, code: 'token_expired' };
const INVALID = { status: 401, message: 'Invalid token.', data: null, code: 'token_invalid' };

describe('AuthInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;
  let tokenRefresh: jasmine.SpyObj<TokenRefreshService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getAccessToken', 'hasValidToken', 'clearSession']);
    authService.getAccessToken.and.returnValue('token-1');
    authService.hasValidToken.and.returnValue(true);
    tokenRefresh = jasmine.createSpyObj<TokenRefreshService>('TokenRefreshService', ['freshToken']);
    tokenRefresh.freshToken.and.returnValue(of('token-2'));
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        { provide: AuthService, useValue: authService },
        { provide: TokenRefreshService, useValue: tokenRefresh },
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('attaches the access token to API and GraphQL requests', () => {
    http.post(GRAPHQL, {}).subscribe();
    http.get('/api/v1/files/companies/c1/plan.json').subscribe();

    expect(backend.expectOne(GRAPHQL).request.headers.get('Authorization')).toBe('Bearer token-1');
    expect(
      backend.expectOne('/api/v1/files/companies/c1/plan.json').request.headers.get('Authorization'),
    ).toBe('Bearer token-1');
  });

  it('never sends the token to other origins or public assets', () => {
    http.get('https://nominatim.openstreetmap.org/reverse?format=json').subscribe();
    http.get('/assets/i18n/en.json').subscribe();

    expect(
      backend.expectOne('https://nominatim.openstreetmap.org/reverse?format=json').request.headers.has('Authorization'),
    ).toBeFalse();
    expect(backend.expectOne('/assets/i18n/en.json').request.headers.has('Authorization')).toBeFalse();
  });

  it('sends the sign-in endpoints without a token', () => {
    http.post('/api/v1/auth/login', {}).subscribe();
    http.post('/api/v1/auth/refresh', {}).subscribe();

    expect(backend.expectOne('/api/v1/auth/login').request.headers.has('Authorization')).toBeFalse();
    expect(backend.expectOne('/api/v1/auth/refresh').request.headers.has('Authorization')).toBeFalse();
  });

  it('renews a token it already knows to be expired before sending the request', () => {
    authService.hasValidToken.and.returnValue(false);

    http.post(GRAPHQL, {}).subscribe();

    expect(tokenRefresh.freshToken).toHaveBeenCalledTimes(1);
    expect(backend.expectOne(GRAPHQL).request.headers.get('Authorization')).toBe('Bearer token-2');
  });

  it('renews the token and repeats the request when the API answers token_expired', () => {
    let body: unknown;
    http.post(GRAPHQL, {}).subscribe((response) => (body = response));

    backend.expectOne(GRAPHQL).flush(EXPIRED, { status: 401, statusText: 'Unauthorized' });
    const retried = backend.expectOne(GRAPHQL);
    retried.flush({ data: { ok: true } });

    expect(retried.request.headers.get('Authorization')).toBe('Bearer token-2');
    expect(body).toEqual({ data: { ok: true } });
    expect(authService.clearSession).not.toHaveBeenCalled();
  });

  it('reads the error code of a file download, whose error body arrives as a Blob', (done) => {
    http.get('/api/v1/files/companies/c1/plan.json', { responseType: 'blob' }).subscribe((blob) => {
      expect(blob.size).toBeGreaterThan(0);
      expect(tokenRefresh.freshToken).toHaveBeenCalledTimes(1);
      done();
    });

    backend
      .expectOne('/api/v1/files/companies/c1/plan.json')
      .flush(new Blob([JSON.stringify(EXPIRED)], { type: 'application/json' }), {
        status: 401,
        statusText: 'Unauthorized',
      });

    // The Blob is read asynchronously before the request is repeated
    setTimeout(() => backend.expectOne('/api/v1/files/companies/c1/plan.json').flush(new Blob(['{}'])), 50);
  });

  it('ends the session when the token is refused for any other reason', () => {
    let error: Error | undefined;
    http.post(GRAPHQL, {}).subscribe({ error: (err: Error) => (error = err) });

    backend.expectOne(GRAPHQL).flush(INVALID, { status: 401, statusText: 'Unauthorized' });

    expect(authService.clearSession).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(error?.message).toContain('session has expired');
    expect(tokenRefresh.freshToken).not.toHaveBeenCalled();
  });

  it('ends the session when the token cannot be renewed', () => {
    tokenRefresh.freshToken.and.returnValue(throwError(() => new Error('refresh refused')));
    let failed = false;
    http.post(GRAPHQL, {}).subscribe({ error: () => (failed = true) });

    backend.expectOne(GRAPHQL).flush(EXPIRED, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBeTrue();
    expect(authService.clearSession).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('passes every other error through untouched', () => {
    let status = 0;
    http.post(GRAPHQL, {}).subscribe({ error: (err: { status: number }) => (status = err.status) });

    backend.expectOne(GRAPHQL).flush({ message: 'nope' }, { status: 403, statusText: 'Forbidden' });

    expect(status).toBe(403);
    expect(authService.clearSession).not.toHaveBeenCalled();
  });
});
