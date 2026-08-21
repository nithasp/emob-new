import { Component, Inject, Input, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import {
  MSAL_GUARD_CONFIG,
  MsalGuardConfiguration,
  MsalService,
} from '@azure/msal-angular';
import { InteractionType } from '@azure/msal-browser';
import { UserADProfile } from 'src/app/models/profile.model';
import packageJson from 'package.json';
import { TranslocoService } from '@jsverse/transloco';
import { LanguageChangeService } from 'src/app/services/language-change.service';
import { filter } from 'rxjs/operators';


@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent implements OnInit {
  @Input() public userADprofile?: UserADProfile;
  public activeRoute: string;
  version: string = packageJson.version;
  currentUrl = '';

  constructor(
    private readonly router: Router,
    @Inject(MSAL_GUARD_CONFIG)
    private readonly msalGuardConfig: MsalGuardConfiguration,
    private readonly authService: MsalService,
    private transloco: TranslocoService,
    private languageChangeService: LanguageChangeService
  ) {
    this.activeRoute = '';
  }

  ngOnInit() {
    this.getLanguage();
    this.router.events
      .pipe(filter(ev => ev instanceof NavigationEnd))
      .subscribe((ev: NavigationEnd) => {
        this.currentUrl = ev.urlAfterRedirects;
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

  get currentLang(): string {
    return this.transloco.getActiveLang();
  }

  toggleLang(lang: 'en' | 'th') {
    this.transloco.setActiveLang(lang);
    localStorage.setItem('lang', lang);
    this.languageChangeService.notifyLangToggle();
  }

  getLanguage() {
    const currentLang =
      localStorage.getItem('lang') || this.transloco.getDefaultLang();
    this.transloco.setActiveLang(currentLang);
  }

  isInConfigurations(): boolean {
    return this.currentUrl.includes('/users/configurations');
  }
}
