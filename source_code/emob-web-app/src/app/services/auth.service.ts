import { Injectable } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { Observable } from 'rxjs';
import { tap, concatMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private readonly msalService: MsalService) {}

  initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.msalService.handleRedirectObservable().pipe(
        tap(response => {
          if (response) {
            this.msalService.instance.setActiveAccount(response.account);
          }
        }),
        concatMap(response => {
          if (!response && this.msalService.instance.getAllAccounts().length === 0) {
            return this.msalService.loginRedirect();
          } else {
            return new Observable<void>(observer => {
              observer.next();
              observer.complete();
            });
          }
        })
      ).subscribe({
        next: () => resolve(),
        error: err => reject(err)
      });
    });
  }
}