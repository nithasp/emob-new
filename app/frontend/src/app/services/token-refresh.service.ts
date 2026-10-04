import { Injectable } from '@angular/core';
import { Observable, finalize, map, shareReplay } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class TokenRefreshService {
  private inFlight: Observable<string> | null = null;

  constructor(private readonly authService: AuthService) {}

  /**
   * A burst of 401s makes a single refresh call: the first caller starts it and the rest share
   * the same attempt, so every waiter sees the same success or the same failure.
   */
  freshToken(): Observable<string> {
    this.inFlight ??= this.authService.refreshAccessToken().pipe(
      map((session) => session.accessToken),
      // Clears on both success and failure, so the next 401 starts a fresh attempt
      finalize(() => (this.inFlight = null)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.inFlight;
  }
}
