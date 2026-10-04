import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, from, map, of, switchMap, throwError } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from '../services/auth/auth.service';
import { TokenRefreshService } from '../services/auth/token-refresh.service';

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/demo', '/auth/logout'];
const SESSION_EXPIRED = 'Your session has expired. Please sign in again.';

const isAuthEndpoint = (url: string): boolean => AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));

/**
 * Only the API and the GraphQL endpoint receive the access token. Map tiles, the geocoder and the
 * translation files are other origins or public assets and must never see it.
 */
const isProtectedResource = (url: string): boolean =>
  url.startsWith(environment.apiConfig.uri) || url.startsWith(environment.graphqlConfig.uri);

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function codeOf(body: string): string | undefined {
  try {
    return (JSON.parse(body) as { code?: string }).code;
  } catch {
    return undefined;
  }
}

function errorCode(error: HttpErrorResponse): Observable<string | undefined> {
  const body: unknown = error.error;
  if (body instanceof Blob) {
    return from(body.text()).pipe(
      map(codeOf),
      catchError(() => of(undefined)),
    );
  }
  if (typeof body === 'string') {
    return of(codeOf(body));
  }
  return of((body as { code?: string } | null)?.code);
}

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private readonly injector: Injector) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!isProtectedResource(req.url) || isAuthEndpoint(req.url)) {
      return next.handle(req);
    }

    const authService = this.injector.get(AuthService);
    const token = authService.getAccessToken();
    if (!token) {
      return next.handle(req).pipe(catchError((error: HttpErrorResponse) => this.handleError(error, req, next)));
    }

    if (!authService.hasValidToken()) {
      return this.retryWithFreshToken(req, next);
    }

    const authReq = addToken(req, token);
    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, authReq, next)),
    );
  }

  private handleError(
    error: HttpErrorResponse,
    req: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    if (error.status !== 401) {
      return throwError(() => error);
    }
    return errorCode(error).pipe(
      switchMap((code) =>
        code === 'token_expired'
          ? this.retryWithFreshToken(req, next)
          : this.endSession(new Error(SESSION_EXPIRED)),
      ),
    );
  }

  private retryWithFreshToken(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return this.injector
      .get(TokenRefreshService)
      .freshToken()
      .pipe(
        catchError(() => this.endSession(new Error(SESSION_EXPIRED))),
        switchMap((token) => next.handle(addToken(req, token))),
      );
  }

  private endSession(error: Error): Observable<never> {
    this.injector.get(AuthService).clearSession();
    void this.injector.get(Router).navigate(['/login']);
    return throwError(() => error);
  }
}
