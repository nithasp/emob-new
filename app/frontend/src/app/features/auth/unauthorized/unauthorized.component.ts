import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';

@Component({
  selector: 'app-unauthorized',
  templateUrl: './unauthorized.component.html',
  styleUrl: './unauthorized.component.scss'
})
export class UnauthorizedComponent {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}
  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
