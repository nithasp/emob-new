import { Component, OnInit, HostListener } from '@angular/core';
import { AuthService } from './services/auth.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  isShow: boolean = false;
  topPosToStartShowing = 500;

  constructor(
    private readonly authService: AuthService
  ) { }

  ngOnInit(): void {
    // Restores the session from the refresh cookie after a page load; the route guards wait for it
    this.authService.initializeAuth().subscribe();
  }


  @HostListener("window:scroll")
  checkScroll() {
    const scrollPosition =
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    if (scrollPosition >= this.topPosToStartShowing) {
      this.isShow = true;
    } else {
      this.isShow = false;
    }
  }
  gotoTop() {
    window.scroll({
      top: 0,
      left: 0,
      behavior: "smooth"
    });
  }
}
