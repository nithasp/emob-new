import { Injectable, inject } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from "@angular/router";
import { Observable, of } from "rxjs";
import { catchError, filter, map, switchMap, take } from "rxjs/operators";

import { AuthService } from 'src/app/services/auth.service';
import { LoggerService } from 'src/app/services/logger.service';

@Injectable()
export class RoleGuard implements CanActivate {
  private readonly logger = inject(LoggerService);

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    const expectedRoles: string[] = route.data['expectedRoles'] ?? [];

    return this.authService.authInitialized$.pipe(
      filter((initialized) => initialized),
      take(1),
      switchMap(() => this.ensureSession()),
      map((signedIn) => {
        if (!signedIn) {
          return this.router.createUrlTree(['/login']);
        }
        if (expectedRoles.length > 0 && !this.authService.hasAnyRole(expectedRoles)) {
          this.logger.warn('You do not have access as the expected role is not found. Please ensure that your account is assigned to a role and then sign-out and sign-in again.');
          return this.router.createUrlTree(['/unauthorized']);
        }
        return true;
      })
    );
  }

  /**
   * A valid access token is enough. Without one the session is renewed from the refresh cookie,
   * and a visitor who has no session at all is let in as the demo account when that is enabled.
   */
  private ensureSession(): Observable<boolean> {
    if (this.authService.hasValidToken()) {
      return of(true);
    }

    const renewed$ = this.authService.getCurrentUser()
      ? this.authService.refreshAccessToken().pipe(
          map(() => true),
          catchError(() => of(false))
        )
      : of(false);

    return renewed$.pipe(
      switchMap((renewed) => (renewed ? of(true) : this.enterAsDemo()))
    );
  }

  private enterAsDemo(): Observable<boolean> {
    if (!this.authService.canEnterAsDemo()) {
      this.authService.clearSession();
      return of(false);
    }
    return this.authService.loginAsDemo().pipe(
      map(() => true),
      catchError(() => {
        this.authService.clearSession();
        return of(false);
      })
    );
  }
}
