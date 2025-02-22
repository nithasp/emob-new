import { Component, Inject, Input, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { MSAL_GUARD_CONFIG, MsalBroadcastService, MsalGuardConfiguration, MsalService } from '@azure/msal-angular';
import { InteractionType } from '@azure/msal-browser';
import $ from 'jquery';
import { UserADProfile } from 'src/app/models/profile.model';
@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent implements OnInit{
  @Input() public userADprofile?: UserADProfile;
  public activeRoute: string;

  constructor(
    private router: Router,
    @Inject(MSAL_GUARD_CONFIG) private readonly msalGuardConfig: MsalGuardConfiguration,
    private readonly authService: MsalService,
    private readonly msalBroadcastService: MsalBroadcastService,
  ){
    this.activeRoute = '';
  }

  ngOnInit() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.activeRoute = event.urlAfterRedirects.split('/')[2];
      }
    });
  }

  logout() {

    if (this.msalGuardConfig.interactionType === InteractionType.Popup) {
      this.authService.logoutPopup({
        account: this.authService.instance.getActiveAccount(),
      });
    } else {
      this.authService.logoutRedirect({
        account: this.authService.instance.getActiveAccount(),
      });
    }
  }
  setActive(route: string) {
    this.activeRoute = route;
  }

  isActive(route: string): boolean {
    return this.activeRoute === route;
  }

}
