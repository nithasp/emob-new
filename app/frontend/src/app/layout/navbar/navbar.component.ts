import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LoggerService } from '@core/services/logger.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  private readonly logger = inject(LoggerService);

  constructor(
    private router: Router
  ){}

  logout(){
    this.logger.log("Delete USer")
    this.router.navigate(['/login'])
  }

}
