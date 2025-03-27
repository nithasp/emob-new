import { Injectable } from '@angular/core';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus, AccountInfo } from '@azure/msal-browser';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UserMSGraphService {

  constructor(private readonly msalService: MsalService, private readonly msalBroadcastService: MsalBroadcastService) {}

  getUserId(): Observable<string | null> {
    return this.msalBroadcastService.inProgress$.pipe(
      filter((status: InteractionStatus) => status === InteractionStatus.None),
      map(() => {
        const account: AccountInfo | null = this.msalService.instance.getActiveAccount();
        return account ? account.localAccountId : null;
      })
    );
  }
}
