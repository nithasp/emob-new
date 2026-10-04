import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private readonly authService: AuthService) {}

  getUserId(): Observable<string | null> {
    return this.authService.authInitialized$.pipe(
      filter((initialized) => initialized),
      take(1),
      map(() => this.authService.getCurrentUser()?.id ?? null)
    );
  }
}
