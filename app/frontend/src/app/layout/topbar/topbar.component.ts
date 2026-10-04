import { Component, Input, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { UserProfile } from 'src/app/models/profile.model';
import { AuthService } from 'src/app/services/auth.service';
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
  @Input() public userProfile?: UserProfile;
  public activeRoute: string;
  version: string = packageJson.version;
  currentUrl = '';

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
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
    this.authService.logout();
    this.router.navigate(['/login']);
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
