import { Injectable } from "@angular/core";
import { CanActivate, Router, UrlTree } from "@angular/router";
import { Observable, of } from "rxjs";
import { catchError, filter, map, switchMap, take } from "rxjs/operators";

import { AuthService } from 'src/app/services/auth.service';

/**
 * Keeps a signed-in user out of the login and register pages. A visitor with no session is sent
 * into the app as the demo account when that is enabled, so the pages show only after a sign-out.
 */
@Injectable()
export class GuestGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    const home = this.router.createUrlTree(['/users']);

    return this.authService.authInitialized$.pipe(
      filter((initialized) => initialized),
      take(1),
      switchMap(() => {
        if (this.authService.hasValidToken()) {
          return of(home);
        }
        if (!this.authService.getCurrentUser()) {
          return this.enterAsDemo(home);
        }
        return this.authService.refreshAccessToken().pipe(
          map(() => home),
          catchError(() => {
            this.authService.clearSession();
            return this.enterAsDemo(home);
          })
        );
      })
    );
  }

  // Unlike RoleGuard this never clears the session: the app shell answers every cleared session
  // by navigating to /login, which would run this guard again without end
  private enterAsDemo(home: UrlTree): Observable<boolean | UrlTree> {
    if (!this.authService.canEnterAsDemo()) {
      return of(true);
    }
    return this.authService.loginAsDemo().pipe(
      map(() => home),
      catchError(() => of(true))
    );
  }
}
