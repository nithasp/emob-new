import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  constructor(
    private router: Router
  ){}

  logout(){
    console.log("Delete USer")
    this.router.navigate(['/login'])
  }

}
