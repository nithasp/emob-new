import { Component, Inject, Input, OnInit } from '@angular/core';
import { GuardsCheckEnd, NavigationEnd, Router, Scroll } from '@angular/router';
import { MSAL_GUARD_CONFIG, MsalBroadcastService, MsalGuardConfiguration, MsalService } from '@azure/msal-angular';
import { InteractionType } from '@azure/msal-browser';
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
    private readonly router: Router,
    @Inject(MSAL_GUARD_CONFIG) private readonly msalGuardConfig: MsalGuardConfiguration,
    private readonly authService: MsalService,
  ){
    this.activeRoute = '';
  }

  ngOnInit() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.activeRoute = event.urlAfterRedirects.split('/')[2];

      }else if (event instanceof Scroll) {
        console.log("Scroll event detected");
        this.activeRoute = event.routerEvent.url.split('/')[2];
        
      }
      console.log("Active Route", this.activeRoute);
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
