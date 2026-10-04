import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserProfile } from '../models/profile.model';
import { AuthUser } from '../models/auth.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from 'src/app/services/auth.service';
@Component({
  selector: 'app-users',
  templateUrl: './index.component.html',
  styleUrl: './index.component.scss'
})
export class IndexComponent implements OnInit, OnDestroy {
  userProfile!: UserProfile;
  private readonly _destroying$ = new Subject<void>();

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) { }
  ngOnInit(): void {
    this.setLoginDisplay(this.authService.getCurrentUser());

    this.authService.currentUser$
      .pipe(takeUntil(this._destroying$))
      .subscribe((user) => {
        this.setLoginDisplay(user);
        // The session ended in this tab or was cleared by the interceptor
        if (!user) {
          this.router.navigate(['/login']);
        }
      });
  }

  setLoginDisplay(user: AuthUser | null) {
    this.userProfile = {
      name: user?.name ?? null,
      username: user?.username ?? null,
      companyName: user?.companyName ?? null
    };
  }


  ngOnDestroy(): void {
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }
}
