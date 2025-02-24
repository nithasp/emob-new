import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MSAL_GUARD_CONFIG, MsalBroadcastService, MsalGuardConfiguration, MsalService } from '@azure/msal-angular';
import { UserADProfile } from '../models/profile.model';
import { EventMessage, EventType, InteractionStatus } from '@azure/msal-browser';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
@Component({
  selector: 'app-users',
  templateUrl: './index.component.html',
  styleUrl: './index.component.scss'
})
export class IndexComponent implements OnInit, OnDestroy {
  userADProfile!: UserADProfile;
  private readonly _destroying$ = new Subject<void>();


  constructor(
    @Inject(MSAL_GUARD_CONFIG) private readonly msalGuardConfig: MsalGuardConfiguration,
    private readonly authService: MsalService,
    private readonly msalBroadcastService: MsalBroadcastService,
    private readonly router: Router
  ) { }
  ngOnInit(): void {
    this.authService.initialize()
      .subscribe(x => {

        this.authService.instance.enableAccountStorageEvents(); // Optional - This will enable ACCOUNT_ADDED and ACCOUNT_REMOVED events emitted when a user logs in or out of another tab or window
        this.msalBroadcastService.msalSubject$
          .pipe(
            filter((msg: EventMessage) => msg.eventType === EventType.ACCOUNT_ADDED || msg.eventType === EventType.ACCOUNT_REMOVED),
          )
          .subscribe((result: EventMessage) => {
            if (this.authService.instance.getAllAccounts().length === 0) {
              this.router.navigate(['/']);
            }
          });

        this.msalBroadcastService.inProgress$
          .pipe(
            filter((status: InteractionStatus) => status === InteractionStatus.None),
            takeUntil(this._destroying$)
          )
          .subscribe(() => {
            let activeAccount = this.authService.instance.getActiveAccount();
            console.log(activeAccount);
            this.userADProfile = {
              name: activeAccount?.name ?? null,
              tenantId: activeAccount?.tenantId ?? null,
              username: activeAccount?.username ?? null
            };
          })
      });
  }
  // unsubscribe to events when component is destroyed
  ngOnDestroy(): void {
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }
}
